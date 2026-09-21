import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../../database/db';
import { config } from '../../config/index';
import { ImageSanitizer } from './imageSanitizer';
import { PhotoModerationService } from '../safety/photoModerationService';
import { ModerationService } from '../safety/moderationService';
import { PhotoVerification } from '../../types/index';

export class PhotoVerificationService {
  /**
   * Submit real current photo/selfie for Level 1 Photo Verification (Section 7)
   */
  public static async submitPhotoVerification(userId: string, imageBuffer: Buffer): Promise<{ success: boolean; message: string }> {
    const db = getDatabase();

    // 1. Sanitize image & validate magic bytes
    const sanitized = await ImageSanitizer.sanitizeImage(imageBuffer);

    // 2. Pre-screen anti-NSFW & face presence
    const inspection = await PhotoModerationService.inspectProfilePhoto(sanitized.sanitizedBuffer);
    if (!inspection.isApproved) {
      return {
        success: false,
        message: `Foto tidak dapat diproses: ${inspection.rejectionReason || 'Tidak memenuhi kriteria'}. Pastikan mengunggah foto selfie diri yang jelas dan berpakaian sopan.`,
      };
    }

    const verifId = uuidv4();
    const verifDir = path.join(config.UPLOADS_DIR, 'verifications');
    if (!fs.existsSync(verifDir)) {
      fs.mkdirSync(verifDir, { recursive: true });
    }

    const savedPath = path.join(verifDir, `photo_${verifId}.webp`);
    fs.writeFileSync(savedPath, sanitized.sanitizedBuffer);

    // Insert or update photo_verifications
    db.prepare(`
      INSERT INTO photo_verifications (id, user_id, photo_hash, status, created_at, updated_at)
      VALUES (?, ?, ?, 'PHOTO_PENDING', datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        photo_hash = excluded.photo_hash,
        status = 'PHOTO_PENDING',
        updated_at = datetime('now')
    `).run(verifId, userId, sanitized.sha256Hash);

    // Update user state
    db.prepare(`
      UPDATE users 
      SET verification_status = 'PHOTO_PENDING', updated_at = datetime('now')
      WHERE id = ?
    `).run(userId);

    return {
      success: true,
      message: 'Foto verifikasi Anda berhasil diterima dan masuk ke antrean peninjauan admin.',
    };
  }

  /**
   * FIFO Photo Verification Queue for Admin (Section 24 & 25)
   */
  public static getPhotoQueue(): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        pv.id as verification_id,
        pv.user_id,
        pv.status,
        pv.created_at,
        pv.review_notes,
        p.display_name,
        p.age,
        p.study_field,
        p.photo_file_id,
        i.name as institution_name,
        i.short_name as institution_short_name,
        u.verification_status,
        u.risk_score
      FROM photo_verifications pv
      LEFT JOIN profiles p ON p.user_id = pv.user_id
      LEFT JOIN institutions i ON i.id = p.institution_id
      JOIN users u ON u.id = pv.user_id
      WHERE pv.status = 'PHOTO_PENDING'
      ORDER BY pv.created_at ASC
    `).all();
  }

  /**
   * Resolve photo verification (Approve / Reject)
   */
  public static resolvePhotoVerification(
    verifId: string,
    action: 'APPROVE' | 'REJECT',
    reviewerId: string,
    notes?: string
  ): void {
    const db = getDatabase();

    const verif = db.prepare('SELECT * FROM photo_verifications WHERE id = ?').get(verifId) as PhotoVerification | undefined;
    if (!verif) {
      throw new Error('VERIFICATION_NOT_FOUND: Antrean verifikasi foto tidak ditemukan.');
    }

    if (action === 'APPROVE') {
      db.prepare(`
        UPDATE photo_verifications 
        SET status = 'PHOTO_VERIFIED', reviewer_id = ?, review_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reviewerId, notes || 'Foto selfie asli terverifikasi', verifId);

      db.prepare(`
        UPDATE users 
        SET verification_status = 'PHOTO_VERIFIED', updated_at = datetime('now')
        WHERE id = ?
      `).run(verif.user_id);

      ModerationService.logAudit({
        actorId: reviewerId,
        actorRole: 'VERIFICATION_ADMIN',
        action: 'APPROVE_PHOTO_VERIFICATION',
        targetResource: 'photo_verifications',
        targetId: verifId,
        details: `Approved photo verification for user ${verif.user_id}. Allowance upgraded to 50 likes/day.`,
      });
    } else {
      db.prepare(`
        UPDATE photo_verifications 
        SET status = 'REJECTED', reviewer_id = ?, review_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reviewerId, notes || 'Foto tidak memenuhi standar keaslian', verifId);

      db.prepare(`
        UPDATE users 
        SET verification_status = 'VERIFICATION_REJECTED', updated_at = datetime('now')
        WHERE id = ?
      `).run(verif.user_id);

      ModerationService.logAudit({
        actorId: reviewerId,
        actorRole: 'VERIFICATION_ADMIN',
        action: 'REJECT_PHOTO_VERIFICATION',
        targetResource: 'photo_verifications',
        targetId: verifId,
        details: `Rejected photo verification for user ${verif.user_id}. Reason: ${notes}`,
      });
    }
  }
}
