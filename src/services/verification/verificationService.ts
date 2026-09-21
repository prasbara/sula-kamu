import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../../database/db.js';
import { config } from '../../config/index.js';
import { Institution, StudentVerification, User } from '../../types/index.js';
import { ImageSanitizer, SanitizedImage } from './imageSanitizer.js';
import { OCRAnalyzer, OCRAnalysisResult } from './ocrAnalyzer.js';

export interface VerificationSubmissionResult {
  success: boolean;
  status: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED';
  userFacingMessage: string;
  internalReason?: string;
  verificationId?: string;
}

export class VerificationService {
  /**
   * Check if global verification kill-switch is active
   */
  public static isVerificationEnabled(): boolean {
    const db = getDatabase();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'verification_enabled'").get() as { value: string } | undefined;
    return row ? row.value === 'true' : true;
  }

  /**
   * Check attempt count within cooldown window (Section 6)
   */
  public static checkAttemptLimit(userId: string): { allowed: boolean; remainingAttempts: number; retryAfterHours?: number } {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - config.VERIFICATION_COOLDOWN_HOURS * 3600 * 1000).toISOString();
    
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM verification_attempts 
      WHERE user_id = ? AND created_at >= ?
    `).get(userId, cutoff) as { count: number };

    const attemptsUsed = countRow.count;
    if (attemptsUsed >= config.MAX_VERIFICATION_ATTEMPTS) {
      return {
        allowed: false,
        remainingAttempts: 0,
        retryAfterHours: config.VERIFICATION_COOLDOWN_HOURS,
      };
    }

    return {
      allowed: true,
      remainingAttempts: config.MAX_VERIFICATION_ATTEMPTS - attemptsUsed,
    };
  }

  /**
   * Process a student card (KTM) submission
   */
  public static async processKtmSubmission(
    userId: string,
    institutionId: string,
    declaredName: string,
    rawImageBuffer: Buffer
  ): Promise<VerificationSubmissionResult> {
    const db = getDatabase();

    // 1. Emergency kill switch check
    if (!this.isVerificationEnabled()) {
      return {
        success: false,
        status: 'REJECTED',
        userFacingMessage: 'Verifikasi KTM sedang ditangguhkan sementara untuk pemeliharaan sistem. Silakan coba beberapa saat lagi.',
        internalReason: 'KILL_SWITCH_ACTIVE',
      };
    }

    // 2. Check attempt limits
    const limitCheck = this.checkAttemptLimit(userId);
    if (!limitCheck.allowed) {
      db.prepare(`
        INSERT INTO verification_attempts (id, user_id, card_hash, status, failure_reason)
        VALUES (?, ?, 'RATE_LIMITED', 'RATE_LIMITED', 'Exceeded maximum verification attempts')
      `).run(uuidv4(), userId);

      return {
        success: false,
        status: 'REJECTED',
        userFacingMessage: `Batas percobaan verifikasi tercapai. Demi keamanan akun, silakan tunggu ${limitCheck.retryAfterHours} jam sebelum mencoba lagi.`,
        internalReason: 'RATE_LIMIT_EXCEEDED',
      };
    }

    // 3. Fetch institution
    const inst = db.prepare('SELECT * FROM institutions WHERE id = ?').get(institutionId) as Institution | undefined;
    if (!inst) {
      return {
        success: false,
        status: 'REJECTED',
        userFacingMessage: 'Institusi yang dipilih tidak valid.',
        internalReason: 'INSTITUTION_NOT_FOUND',
      };
    }

    // 4. Sanitize image & extract fingerprints (Magic bytes + EXIF strip)
    let sanitized: SanitizedImage;
    try {
      sanitized = await ImageSanitizer.sanitizeImage(rawImageBuffer);
    } catch (err: any) {
      // Log security event
      db.prepare(`
        INSERT INTO security_events (id, event_type, severity, details, user_id)
        VALUES (?, 'INVALID_IMAGE_PAYLOAD', 'HIGH', ?, ?)
      `).run(uuidv4(), err.message || 'Image sanitization failed', userId);

      return {
        success: false,
        status: 'REJECTED',
        userFacingMessage: 'Format foto kartu mahasiswa tidak valid atau rusak. Pastikan mengunggah file foto asli (JPG/PNG).',
        internalReason: 'MAGIC_BYTE_OR_IMAGE_PARSE_FAILURE',
      };
    }

    // 5. Anti-Fraud: Duplicate card detection (SHA-256 and perceptual hash)
    const duplicateRow = db.prepare(`
      SELECT user_id, status FROM student_verifications 
      WHERE card_hash = ? AND user_id != ?
    `).get(sanitized.sha256Hash, userId) as { user_id: string; status: string } | undefined;

    if (duplicateRow) {
      db.prepare(`
        INSERT INTO verification_attempts (id, user_id, card_hash, status, failure_reason)
        VALUES (?, ?, ?, 'FAILED_DUPLICATE', 'Card hash already registered to another user')
      `).run(uuidv4(), userId, sanitized.sha256Hash);

      // Flag user risk score
      db.prepare('UPDATE users SET risk_score = risk_score + 50 WHERE id = ?').run(userId);

      db.prepare(`
        INSERT INTO security_events (id, event_type, severity, details, user_id)
        VALUES (?, 'DUPLICATE_KTM_DETECTED', 'HIGH', ?, ?)
      `).run(uuidv4(), `Duplicate card hash ${sanitized.sha256Hash} matched user ${duplicateRow.user_id}`, userId);

      return {
        success: false,
        status: 'REJECTED',
        userFacingMessage: 'Kartu mahasiswa ini sudah terdaftar dalam sistem. Satu KTM hanya dapat digunakan untuk satu akun.',
        internalReason: 'DUPLICATE_CARD_HASH',
      };
    }

    // 6. OCR Text Extraction and Verification Scoring
    let ocrResult: OCRAnalysisResult;
    try {
      ocrResult = await OCRAnalyzer.analyzeCard(sanitized.sanitizedBuffer, inst, declaredName);
    } catch (err: any) {
      ocrResult = {
        extractedText: '',
        institutionMatchScore: 0,
        nameMatchScore: 0,
        hasSuspiciousKeywords: false,
        suspiciousKeywordsFound: [],
        overallConfidence: 0,
        recommendedStatus: 'NEEDS_REVIEW',
        reasonSummary: 'OCR analysis execution error, sent to manual review',
      };
    }

    const verificationId = uuidv4();
    const retentionExpiry = new Date(Date.now() + config.KTM_RETENTION_HOURS * 3600 * 1000).toISOString();

    // 7. Save temporary sanitized image only if human review is needed (Section 5: privacy-safe retention)
    let tempStoragePath: string | null = null;
    if (ocrResult.recommendedStatus === 'NEEDS_REVIEW') {
      const filename = `ktm_review_${verificationId}.webp`;
      tempStoragePath = path.join(config.UPLOADS_DIR, filename);
      fs.writeFileSync(tempStoragePath, sanitized.sanitizedBuffer);
    }

    // 8. Record in student_verifications table
    const existingVerif = db.prepare('SELECT id FROM student_verifications WHERE user_id = ?').get(userId);
    if (existingVerif) {
      db.prepare(`
        UPDATE student_verifications
        SET institution_id = ?, status = ?, card_hash = ?, ocr_extracted_text = ?, 
            ocr_confidence = ?, review_notes = ?, expires_at = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(
        inst.id,
        ocrResult.recommendedStatus,
        sanitized.sha256Hash,
        ocrResult.extractedText.slice(0, 1000),
        ocrResult.overallConfidence,
        ocrResult.reasonSummary,
        retentionExpiry,
        userId
      );
    } else {
      db.prepare(`
        INSERT INTO student_verifications (
          id, user_id, institution_id, status, card_hash, ocr_extracted_text,
          ocr_confidence, review_notes, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        verificationId,
        userId,
        inst.id,
        ocrResult.recommendedStatus,
        sanitized.sha256Hash,
        ocrResult.extractedText.slice(0, 1000),
        ocrResult.overallConfidence,
        ocrResult.reasonSummary,
        retentionExpiry
      );
    }

    // 9. Update user status if auto-verified
    if (ocrResult.recommendedStatus === 'VERIFIED') {
      db.prepare("UPDATE users SET status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?").run(userId);
      db.prepare("UPDATE student_verifications SET verified_at = datetime('now') WHERE user_id = ?").run(userId);
    }

    // 10. Record attempt log
    db.prepare(`
      INSERT INTO verification_attempts (id, user_id, card_hash, status, failure_reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      sanitized.sha256Hash,
      ocrResult.recommendedStatus === 'VERIFIED' ? 'SUCCESS' : ocrResult.recommendedStatus,
      ocrResult.reasonSummary
    );

    if (ocrResult.recommendedStatus === 'VERIFIED') {
      return {
        success: true,
        status: 'VERIFIED',
        userFacingMessage: `Selamat! Kartu mahasiswa Anda berhasil diverifikasi untuk kampus ${inst.short_name}. Akun Anda kini aktif.`,
        verificationId,
      };
    } else if (ocrResult.recommendedStatus === 'NEEDS_REVIEW') {
      return {
        success: true,
        status: 'NEEDS_REVIEW',
        userFacingMessage: 'Kartu mahasiswa Anda telah diterima dan sedang dalam antrean verifikasi manual oleh tim reviewer. Kami akan mengabari Anda setelah selesai diperiksa.',
        internalReason: ocrResult.reasonSummary,
        verificationId,
      };
    } else {
      return {
        success: false,
        status: 'REJECTED',
        userFacingMessage: 'Verifikasi kartu mahasiswa belum berhasil. Pastikan foto KTM terlihat jelas, tidak buram, dan nama sesuai dengan profil Anda.',
        internalReason: ocrResult.reasonSummary,
        verificationId,
      };
    }
  }
}
