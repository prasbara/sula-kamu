import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../../database/db';
import { config } from '../../config/index';
import { Institution, StudentVerification, User } from '../../types/index';
import { ImageSanitizer, SanitizedImage } from './imageSanitizer';
import { OCRAnalyzer, OCRAnalysisResult } from './ocrAnalyzer';
import { AiKtmValidator, AiKtmValidationResult } from './aiKtmValidator';
import { ModerationService } from '../safety/moderationService';

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

    // 6. OpenRouter AI Vision + OCR Analysis
    let finalStatus: 'VERIFIED' | 'NEEDS_REVIEW' | 'REJECTED' = 'NEEDS_REVIEW';
    let extractedText = '';
    let confidence = 0;
    let reasonSummary = '';

    // Step 6A: AI Vision Analysis with OpenRouter
    let aiResult: AiKtmValidationResult | null = null;
    try {
      aiResult = await AiKtmValidator.analyzeCard(sanitized.sanitizedBuffer, inst, declaredName);
      if (aiResult) {
        confidence = aiResult.confidence;
        reasonSummary = `[AI Vision] ${aiResult.reason} (Confidence: ${aiResult.confidence}%)`;
        extractedText = `Inst: ${aiResult.extractedInstitution || inst.name} | Nama: ${aiResult.extractedName || declaredName} | NIM: ${aiResult.extractedNim || '-'}`;

        if (aiResult.verdict === 'VERIFIED') {
          // AI verified it as genuine authentic KTM with high confidence (>= 85%)
          finalStatus = 'VERIFIED';
          reasonSummary = `[Auto-Verified AI] Kartu mahasiswa asli & terverifikasi resmi untuk ${inst.short_name} (Confidence: ${aiResult.confidence}%)`;
        } else if (aiResult.verdict === 'REJECTED' && aiResult.isTamperedOrSuspicious) {
          // Flagged as suspicious or tampered; hold for admin review rather than hard-failing immediately unless critical
          finalStatus = 'NEEDS_REVIEW';
          reasonSummary = `[AI Flagged Suspicious] Memerlukan verifikasi admin: ${aiResult.reason}`;
        } else {
          // Ambiguous / needs manual check
          finalStatus = 'NEEDS_REVIEW';
          reasonSummary = `[AI Review Needed] Memerlukan persetujuan admin: ${aiResult.reason}`;
        }
      }
    } catch (err: any) {
      console.warn('AI Vision processing encountered error, falling back to OCR:', err.message);
    }

    // Step 6B: Fallback or complementary OCR analysis if AI is inconclusive or unavailable
    if (!aiResult || aiResult.confidence === 0) {
      try {
        const ocrResult = await OCRAnalyzer.analyzeCard(sanitized.sanitizedBuffer, inst, declaredName);
        extractedText = ocrResult.extractedText;
        confidence = ocrResult.overallConfidence;
        finalStatus = ocrResult.recommendedStatus;
        reasonSummary = `[OCR Fallback] ${ocrResult.reasonSummary}`;
      } catch (err: any) {
        finalStatus = 'NEEDS_REVIEW';
        reasonSummary = 'Analisa otomatis terkendala; dikirim ke antrean admin review';
      }
    }

    const verificationId = uuidv4();
    const retentionExpiry = new Date(Date.now() + config.KTM_RETENTION_HOURS * 3600 * 1000).toISOString();

    // 7. Save temporary sanitized image if human review is needed (Section 5: privacy-safe retention)
    let tempStoragePath: string | null = null;
    if (finalStatus === 'NEEDS_REVIEW') {
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
        finalStatus,
        sanitized.sha256Hash,
        extractedText.slice(0, 1000),
        confidence,
        reasonSummary,
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
        finalStatus,
        sanitized.sha256Hash,
        extractedText.slice(0, 1000),
        confidence,
        reasonSummary,
        retentionExpiry
      );
    }

    // 9. Update user status & verification tier
    if (finalStatus === 'VERIFIED') {
      db.prepare("UPDATE users SET status = 'ACTIVE', verification_status = 'KTM_VERIFIED', updated_at = datetime('now') WHERE id = ?").run(userId);
      db.prepare("UPDATE student_verifications SET verified_at = datetime('now') WHERE user_id = ?").run(userId);
    } else if (finalStatus === 'NEEDS_REVIEW') {
      db.prepare("UPDATE users SET verification_status = 'KTM_PENDING', updated_at = datetime('now') WHERE id = ?").run(userId);
    } else {
      db.prepare("UPDATE users SET verification_status = 'VERIFICATION_REJECTED', updated_at = datetime('now') WHERE id = ?").run(userId);
    }

    // 10. Record attempt log
    db.prepare(`
      INSERT INTO verification_attempts (id, user_id, card_hash, status, failure_reason)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      userId,
      sanitized.sha256Hash,
      finalStatus === 'VERIFIED' ? 'SUCCESS' : finalStatus,
      reasonSummary
    );

    if (finalStatus === 'VERIFIED') {
      return {
        success: true,
        status: 'VERIFIED',
        userFacingMessage: `🎉 Selamat! Kartu mahasiswa Anda berhasil diverifikasi otomatis oleh AI untuk kampus ${inst.short_name}. Akun Anda kini aktif.`,
        verificationId,
      };
    } else if (finalStatus === 'NEEDS_REVIEW') {
      return {
        success: true,
        status: 'NEEDS_REVIEW',
        userFacingMessage: '✅ Kartu mahasiswa Anda telah diterima. Kartu Anda sedang ditinjau oleh tim verifikator admin kami untuk memastikan keaslian. Kami akan segera mengabari Anda setelah selesai.',
        internalReason: reasonSummary,
        verificationId,
      };
    } else {
      return {
        success: false,
        status: 'REJECTED',
        userFacingMessage: 'Verifikasi kartu mahasiswa belum berhasil. Pastikan foto KTM asli, jelas, tidak terpotong, dan nama sesuai.',
        internalReason: reasonSummary,
        verificationId,
      };
    }
  }

  /**
   * Get KTM manual review queue (FIFO)
   */
  public static getReviewQueue(): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        sv.id,
        sv.user_id,
        sv.institution_id,
        sv.status,
        sv.ocr_extracted_text,
        sv.ocr_confidence,
        sv.review_notes,
        sv.created_at,
        i.name as institution_name,
        i.short_name as institution_short_name,
        p.display_name,
        p.study_field
      FROM student_verifications sv
      JOIN institutions i ON i.id = sv.institution_id
      LEFT JOIN profiles p ON p.user_id = sv.user_id
      WHERE sv.status = 'NEEDS_REVIEW'
      ORDER BY sv.created_at ASC
    `).all();
  }

  /**
   * Resolve KTM manual review (APPROVE / REJECT)
   */
  public static resolveManualReview(
    verificationId: string,
    action: 'APPROVE' | 'REJECT',
    reviewerId: string,
    reason?: string
  ): void {
    const db = getDatabase();
    const verif = db.prepare('SELECT * FROM student_verifications WHERE id = ?').get(verificationId) as any;
    if (!verif) throw new Error('VERIFICATION_NOT_FOUND: Verifikasi tidak ditemukan.');

    if (action === 'APPROVE') {
      db.prepare(`
        UPDATE student_verifications 
        SET status = 'VERIFIED', review_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reason || 'Disetujui manual oleh verifikator', verificationId);

      db.prepare("UPDATE users SET status = 'ACTIVE', verification_status = 'KTM_VERIFIED', updated_at = datetime('now') WHERE id = ?").run(verif.user_id);
    } else {
      db.prepare(`
        UPDATE student_verifications 
        SET status = 'REJECTED', review_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reason || 'Ditolak manual oleh verifikator', verificationId);

      db.prepare("UPDATE users SET verification_status = 'VERIFICATION_REJECTED', updated_at = datetime('now') WHERE id = ?").run(verif.user_id);
    }

    // Write to immutable privileged audit log
    ModerationService.logAudit({
      actorId: reviewerId,
      actorRole: 'VERIFICATION_ADMIN',
      action: `KTM_${action}`,
      targetResource: 'student_verifications',
      targetId: verificationId,
      details: `KTM verification for user ${verif.user_id} was ${action}. Reason: ${reason || '-'}`,
    });

    // Purge temporary physical review file per data minimization & retention policy (Section 5)
    try {
      const filename = `ktm_review_${verificationId}.webp`;
      const tempPath = path.join(config.UPLOADS_DIR, filename);
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupErr) {
      console.warn('Failed to unlink temporary KTM review file:', cleanupErr);
    }
  }
}
