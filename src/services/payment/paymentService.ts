import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from '../../database/db';
import { config } from '../../config/index';
import { ImageSanitizer } from '../verification/imageSanitizer';
import { ModerationService } from '../safety/moderationService';
import { SupportService } from '../support/supportService';
import { PaymentRequest, SubscriptionPlan } from '../../types/index';

export class PaymentService {
  /**
   * Get active subscription plans (Section 11)
   */
  public static getPlans(): SubscriptionPlan[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY price ASC').all() as unknown as SubscriptionPlan[];
  }

  /**
   * Create a new payment request initiated from Website (Section 12 & 13)
   */
  public static createPaymentRequest(
    userId: string,
    planId: string,
    paymentMethod: 'QRIS' | 'BANK_TRANSFER' = 'QRIS'
  ): PaymentRequest {
    const db = getDatabase();

    // Verify user exists and is eligible
    const user = db.prepare('SELECT status FROM users WHERE id = ?').get(userId) as { status: string } | undefined;
    if (!user) {
      throw new Error('USER_NOT_FOUND: Pengguna tidak ditemukan.');
    }
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new Error('USER_INELIGIBLE: Akun Anda sedang ditangguhkan dan tidak dapat membeli langganan.');
    }

    // Verify plan exists
    const plan = db.prepare('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1').get(planId) as unknown as
      | SubscriptionPlan
      | undefined;
    if (!plan) {
      throw new Error('INVALID_PLAN: Paket langganan tidak valid atau sudah tidak aktif.');
    }

    // Generate formatted ID e.g. PAY-NIVA-XXXXXX
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const paymentId = `PAY-NIVA-${randomSuffix}`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours deadline

    db.prepare(`
      INSERT INTO payment_requests (
        id, user_id, plan_id, amount, payment_method, status, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, datetime('now'))
    `).run(paymentId, userId, plan.id, plan.price, paymentMethod, expiresAt);

    return db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as unknown as PaymentRequest;
  }

  /**
   * Upload payment proof (Section 14: Validates MIME, magic bytes, dimensions)
   */
  public static async submitPaymentProof(paymentId: string, rawBuffer: Buffer): Promise<void> {
    const db = getDatabase();

    const payment = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as
      | PaymentRequest
      | undefined;
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND: Tagihan pembayaran tidak ditemukan.');
    }

    if (payment.status === 'APPROVED') {
      throw new Error('ALREADY_APPROVED: Pembayaran ini sudah diverifikasi dan disetujui sebelumnya.');
    }

    // Sanitize image & validate magic bytes
    const sanitized = await ImageSanitizer.sanitizeImage(rawBuffer);

    // Save proof image securely
    const paymentsDir = path.join(config.UPLOADS_DIR, 'payments');
    if (!fs.existsSync(paymentsDir)) {
      fs.mkdirSync(paymentsDir, { recursive: true });
    }

    const proofPath = path.join(paymentsDir, `proof_${paymentId}.webp`);
    fs.writeFileSync(proofPath, sanitized.sanitizedBuffer);

    // Update status to UNDER_REVIEW (FIFO Queue entry)
    db.prepare(`
      UPDATE payment_requests 
      SET status = 'UNDER_REVIEW', proof_image_path = ?, proof_submitted_at = datetime('now')
      WHERE id = ?
    `).run(proofPath, paymentId);
  }

  /**
   * FIFO Payment Queue for Admin (Section 15: Earliest submitted proof first)
   */
  public static getPaymentQueue(): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        pr.id as payment_id,
        pr.user_id,
        pr.plan_id,
        pr.amount,
        pr.payment_method,
        pr.status,
        pr.proof_submitted_at,
        pr.created_at,
        pr.review_notes,
        sp.name as plan_name,
        p.display_name,
        i.short_name as institution_short_name,
        u.verification_status,
        u.subscription_status
      FROM payment_requests pr
      JOIN subscription_plans sp ON sp.id = pr.plan_id
      LEFT JOIN profiles p ON p.user_id = pr.user_id
      LEFT JOIN institutions i ON i.id = p.institution_id
      JOIN users u ON u.id = pr.user_id
      WHERE pr.status IN ('UNDER_REVIEW', 'PROOF_SUBMITTED', 'PENDING')
      ORDER BY 
        CASE WHEN pr.proof_submitted_at IS NOT NULL THEN 0 ELSE 1 END ASC,
        pr.proof_submitted_at ASC,
        pr.created_at ASC
    `).all();
  }

  /**
   * Transactional payment approval & subscription activation (Section 17 & 18)
   */
  public static resolvePayment(
    paymentId: string,
    action: 'APPROVE' | 'REJECT',
    reviewerId: string,
    notes?: string
  ): void {
    const db = getDatabase();

    const payment = db.prepare('SELECT * FROM payment_requests WHERE id = ?').get(paymentId) as
      | PaymentRequest
      | undefined;
    if (!payment) {
      throw new Error('PAYMENT_NOT_FOUND: Pembayaran tidak ditemukan.');
    }

    if (payment.status === 'APPROVED') {
      throw new Error('ALREADY_APPROVED: Pembayaran telah disetujui sebelumnya.');
    }

    if (action === 'APPROVE') {
      // Begin transactional activation
      db.exec('BEGIN TRANSACTION;');
      try {
        // 1. Update payment request
        db.prepare(`
          UPDATE payment_requests 
          SET status = 'APPROVED', reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?
          WHERE id = ?
        `).run(reviewerId, notes || 'Bukti transfer/QRIS valid', paymentId);

        // 2. Create/update active subscription (+30 days duration)
        const subId = uuidv4();
        const startsAt = new Date().toISOString();
        const endsAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

        db.prepare(`
          INSERT INTO subscriptions (id, user_id, payment_id, plan_id, status, starts_at, ends_at)
          VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
        `).run(subId, payment.user_id, paymentId, payment.plan_id, startsAt, endsAt);

        // 3. Update user subscription status
        db.prepare(`
          UPDATE users 
          SET subscription_status = 'PREMIUM_ACTIVE', updated_at = datetime('now')
          WHERE id = ?
        `).run(payment.user_id);

        // 4. Audit Log
        ModerationService.logAudit({
          actorId: reviewerId,
          actorRole: 'PAYMENT_ADMIN',
          action: 'APPROVE_PAYMENT',
          targetResource: 'payment_requests',
          targetId: paymentId,
          details: `Approved payment ${paymentId} (${payment.amount}) for user ${payment.user_id}. Premium activated for 30 days.`,
        });

        db.exec('COMMIT;');

        // Section 24: Payment approval Telegram notification with exact backend expiry date
        const formattedDate = new Date(endsAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        SupportService.sendTelegramNotification(
          payment.user_id,
          `✅ *Premium kamu sudah aktif sampai ${formattedDate}.*\n\nBatas harian like ditingkatkan menjadi 50 like/hari dengan prioritas rekomendasi.`
        ).catch(() => {});
      } catch (err) {
        db.exec('ROLLBACK;');
        throw err;
      }
    } else {
      // Reject payment
      db.prepare(`
        UPDATE payment_requests 
        SET status = 'REJECTED', reviewed_by = ?, reviewed_at = datetime('now'), review_notes = ?
        WHERE id = ?
      `).run(reviewerId, notes || 'Bukti pembayaran tidak valid', paymentId);

      ModerationService.logAudit({
        actorId: reviewerId,
        actorRole: 'PAYMENT_ADMIN',
        action: 'REJECT_PAYMENT',
        targetResource: 'payment_requests',
        targetId: paymentId,
        details: `Rejected payment ${paymentId}. Reason: ${notes}`,
      });

      // Telegram notification for payment rejection
      SupportService.sendTelegramNotification(
        payment.user_id,
        `⚠️ *Verifikasi pembayaran NIVA Premium belum berhasil.*\n\nAlasan: ${notes || 'Bukti transfer tidak valid'}. Silakan periksa kembali melalui menu bantuan website.`
      ).catch(() => {});
    }
  }

  /**
   * Super-admin promotional premium grant with mandatory audit reason (Section 20 & 22)
   */
  public static grantPromotionalPremium(
    userId: string,
    durationDays: number,
    grantorId: string,
    reason: string
  ): void {
    if (!reason || reason.trim().length < 5) {
      throw new Error('MANDATORY_REASON: Alasan pemberian premium promosi wajib diisi secara jelas.');
    }

    const db = getDatabase();
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND: Pengguna tidak ditemukan.');
    }

    db.exec('BEGIN TRANSACTION;');
    try {
      const subId = uuidv4();
      const startsAt = new Date().toISOString();
      const endsAt = new Date(Date.now() + durationDays * 24 * 3600 * 1000).toISOString();

      db.prepare(`
        INSERT INTO subscriptions (id, user_id, payment_id, plan_id, status, starts_at, ends_at)
        VALUES (?, ?, NULL, 'promotional', 'ACTIVE', ?, ?)
      `).run(subId, userId, startsAt, endsAt);

      db.prepare(`
        UPDATE users 
        SET subscription_status = 'PREMIUM_ACTIVE', updated_at = datetime('now')
        WHERE id = ?
      `).run(userId);

      ModerationService.logAudit({
        actorId: grantorId,
        actorRole: 'SUPER_ADMIN',
        action: 'GRANT_PROMOTIONAL_PREMIUM',
        targetResource: 'users',
        targetId: userId,
        details: `Granted promotional premium (${durationDays} days) to user ${userId}. Mandatory reason: ${reason}`,
      });

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }
}
