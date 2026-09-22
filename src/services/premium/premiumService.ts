import crypto from 'node:crypto';
import { getDatabase } from '../../database/db';
import { ImageSanitizer } from '../verification/imageSanitizer';
import { SupportService } from '../support/supportService';
import { NotifyService } from '../notification/notifyService';
import { ModerationService } from '../safety/moderationService';
import { IdentityService } from '../identity/identityService';

export interface PremiumPlan {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  description: string;
  features: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PremiumOrder {
  id: string;
  public_order_id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  created_at: string;
  updated_at: string;
}

export interface PremiumPayment {
  id: string;
  order_id: string;
  payment_method: string;
  amount: number;
  paid_at: string | null;
  proof_file_id: string | null;
  proof_data: string | null;
  user_note: string | null;
  verification_status: 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED';
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PremiumSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  order_id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  started_at: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export class PremiumService {
  /**
   * Format integer price to Indonesian Rupiah representation: Rp5.000 / Rp8.000
   */
  public static formatRupiah(amount: number): string {
    return `Rp${amount.toLocaleString('id-ID')}`;
  }

  /**
   * Generate cryptographically random non-sequential order ID: NIVA-PREM-XXXXXX
   */
  public static generatePublicOrderId(): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    const bytes = crypto.randomBytes(6);
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return `NIVA-PREM-${code}`;
  }

  /**
   * Get all active premium plans from database
   */
  public static getPlans(): PremiumPlan[] {
    const db = getDatabase();
    return db.prepare('SELECT * FROM premium_plans WHERE is_active = 1 ORDER BY price ASC').all() as unknown as PremiumPlan[];
  }

  /**
   * Get specific plan by ID
   */
  public static getPlanById(planId: string): PremiumPlan | null {
    const db = getDatabase();
    const plan = db.prepare('SELECT * FROM premium_plans WHERE id = ?').get(planId) as unknown as PremiumPlan | undefined;
    return plan || null;
  }

  /**
   * Create a new premium purchase order and link it to a support ticket for admin communication
   */
  public static createOrder(params: {
    planId: string;
    userId?: string;
    contactName?: string;
    contactEmail?: string;
    contactTelegram?: string;
    userNote?: string;
  }): {
    order: PremiumOrder;
    payment: PremiumPayment;
    plan: PremiumPlan;
    ticketId: string;
    ticketAccessToken: string;
    qrisInfo: {
      accountName: string;
      instructions: string;
      qrisImageUrl: string | null;
    };
  } {
    const db = getDatabase();
    const plan = this.getPlanById(params.planId);
    if (!plan || !plan.is_active) {
      throw new Error('Paket langganan Premium tidak valid atau tidak aktif.');
    }

    const orderDbId = `pord_${crypto.randomUUID()}`;
    const publicOrderId = this.generatePublicOrderId();
    const paymentDbId = `ppay_${crypto.randomUUID()}`;
    const effectiveUserId = params.userId || `guest_${crypto.randomBytes(8).toString('hex')}`;

    // 1. Insert order
    db.prepare(`
      INSERT INTO premium_orders (
        id, public_order_id, user_id, plan_id, amount, currency, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'IDR', 'PENDING', datetime('now'), datetime('now'))
    `).run(orderDbId, publicOrderId, effectiveUserId, plan.id, plan.price);

    // 2. Insert payment record
    db.prepare(`
      INSERT INTO premium_payments (
        id, order_id, payment_method, amount, verification_status, user_note, created_at, updated_at
      ) VALUES (?, ?, 'QRIS', ?, 'PENDING', ?, datetime('now'), datetime('now'))
    `).run(paymentDbId, orderDbId, plan.price, params.userNote || null);

    // 3. Log initial creation
    db.prepare(`
      INSERT INTO payment_verification_logs (id, order_id, admin_id, action, notes, created_at)
      VALUES (?, ?, NULL, 'ORDER_CREATED', ?, datetime('now'))
    `).run(`log_${crypto.randomUUID()}`, orderDbId, `Order created for ${plan.name} (${this.formatRupiah(plan.price)})`);

    // 4. Create linked Support Ticket so user and admin can communicate directly
    const ticket = SupportService.createUnifiedTicket({
      category: 'PREMIUM',
      subject: `Verifikasi Premium — ${publicOrderId}`,
      message: `Permohonan Pembelian NIVA Premium:
Nomor Order: ${publicOrderId}
Paket: ${plan.name}
Nominal Pembayaran: ${this.formatRupiah(plan.price)}
Metode: QRIS via Chat Admin
Kontak Pembeli: ${params.contactName || 'Pengguna NIVA'} (${params.contactEmail || params.contactTelegram || 'Web Guest'})
Catatan: ${params.userNote || '-'}

Instruksi:
Halo! Pesanan NIVA Premium Anda telah diterima. Admin NIVA akan segera mengirimkan kode pembayaran QRIS resmi melalui ruang percakapan tiket ini. Setelah Anda menerima QRIS dan melakukan transfer, silakan kirimkan bukti pembayaran di sini untuk diverifikasi oleh admin.`,
      contactName: params.contactName || 'Pemesan Premium',
      contactEmail: params.contactEmail || undefined,
      priority: 'HIGH',
    });

    const order = db.prepare('SELECT * FROM premium_orders WHERE id = ?').get(orderDbId) as unknown as PremiumOrder;
    const payment = db.prepare('SELECT * FROM premium_payments WHERE id = ?').get(paymentDbId) as unknown as PremiumPayment;

    // Notify admin
    NotifyService.notifyPaymentEvent('NEW_PAYMENT', {
      paymentId: publicOrderId,
      userId: effectiveUserId,
      planName: plan.name,
      amount: plan.price,
      notes: params.userNote,
    }).catch(() => {});

    return {
      order,
      payment,
      plan,
      ticketId: ticket.ticket.id,
      ticketAccessToken: ticket.accessToken,
      qrisInfo: {
        accountName: process.env.PAYMENT_ACCOUNT_NAME || 'NIVA Indonesia (QRIS)',
        instructions: process.env.PAYMENT_INSTRUCTIONS || 'Pindai kode QRIS resmi NIVA melalui m-Banking atau e-Wallet (GoPay, OVO, Dana, ShopeePay, dsb). Pastikan nominal transfer tepat.',
        qrisImageUrl: process.env.PREMIUM_QRIS_IMAGE_URL || null,
      },
    };
  }

  /**
   * Retrieve order by public order ID (e.g. NIVA-PREM-7K4X92)
   */
  public static getOrderByPublicId(publicOrderId: string): {
    order: PremiumOrder;
    payment: PremiumPayment;
    plan: PremiumPlan;
    subscription?: PremiumSubscription | null;
  } | null {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM premium_orders WHERE public_order_id = ?').get(publicOrderId) as unknown as PremiumOrder | undefined;
    if (!order) return null;

    const payment = db.prepare('SELECT * FROM premium_payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id) as unknown as PremiumPayment | undefined;
    const plan = db.prepare('SELECT * FROM premium_plans WHERE id = ?').get(order.plan_id) as unknown as PremiumPlan | undefined;
    const subscription = db.prepare('SELECT * FROM premium_subscriptions WHERE order_id = ?').get(order.id) as unknown as PremiumSubscription | undefined;

    if (!payment || !plan) return null;

    return {
      order,
      payment,
      plan,
      subscription: subscription || null,
    };
  }

  /**
   * User submits payment confirmation and optional proof image
   */
  public static async confirmPayment(params: {
    publicOrderId: string;
    userNote?: string;
    proofBuffer?: Buffer;
    proofFilename?: string;
    ticketId?: string;
    ticketAccessToken?: string;
  }): Promise<{ success: boolean; status: string; message: string }> {
    const db = getDatabase();
    const details = this.getOrderByPublicId(params.publicOrderId);
    if (!details) {
      throw new Error('Order tidak ditemukan.');
    }

    if (details.order.status === 'VERIFIED') {
      throw new Error('Pesanan ini telah diverifikasi dan disetujui sebelumnya.');
    }

    let proofDataUrl: string | null = null;
    if (params.proofBuffer && params.proofBuffer.length > 0) {
      // Validate and sanitize image proof
      const sanitized = await ImageSanitizer.sanitizeImage(params.proofBuffer);
      proofDataUrl = `data:image/webp;base64,${sanitized.sanitizedBuffer.toString('base64')}`;
    }

    // Update order status to UNDER_REVIEW
    db.prepare(`
      UPDATE premium_orders 
      SET status = 'UNDER_REVIEW', updated_at = datetime('now')
      WHERE id = ?
    `).run(details.order.id);

    // Update payment record
    if (proofDataUrl) {
      db.prepare(`
        UPDATE premium_payments 
        SET verification_status = 'UNDER_REVIEW',
            paid_at = datetime('now'),
            proof_data = ?,
            user_note = COALESCE(?, user_note),
            updated_at = datetime('now')
        WHERE order_id = ?
      `).run(proofDataUrl, params.userNote || null, details.order.id);
    } else {
      db.prepare(`
        UPDATE premium_payments 
        SET verification_status = 'UNDER_REVIEW',
            paid_at = datetime('now'),
            user_note = COALESCE(?, user_note),
            updated_at = datetime('now')
        WHERE order_id = ?
      `).run(params.userNote || null, details.order.id);
    }

    // Log verification event
    db.prepare(`
      INSERT INTO payment_verification_logs (id, order_id, admin_id, action, notes, created_at)
      VALUES (?, ?, NULL, 'PAYMENT_CONFIRMED', ?, datetime('now'))
    `).run(`log_${crypto.randomUUID()}`, details.order.id, `User confirmed payment. Note: ${params.userNote || '-'}`);

    // If ticket details provided, post an update into support chat
    if (params.ticketId && params.ticketAccessToken) {
      try {
        SupportService.sendMessageWithToken(
          params.ticketId,
          params.ticketAccessToken,
          'Pembeli Premium',
          `[Konfirmasi Pembayaran] Saya telah melakukan pembayaran QRIS untuk pesanan ${params.publicOrderId}.${params.userNote ? `\nCatatan: ${params.userNote}` : ''}${proofDataUrl ? '\n(Bukti transfer telah dilampirkan ke sistem verifikasi admin).' : ''}`
        );
      } catch {}
    }

    // Notify internal operational bot
    NotifyService.notifyPaymentEvent('NEW_PAYMENT', {
      paymentId: params.publicOrderId,
      userId: details.order.user_id,
      planName: details.plan.name,
      amount: details.order.amount,
      notes: params.userNote,
    }).catch(() => {});

    return {
      success: true,
      status: 'UNDER_REVIEW',
      message: 'Pembayaran Anda telah dikirim untuk verifikasi admin. Tim NIVA akan meninjau antrean pembayaran Anda.',
    };
  }

  /**
   * Admin reviews and approves premium payment -> Activates Subscription Server-Side
   */
  public static adminApproveOrder(params: {
    publicOrderId: string;
    adminId: string;
    adminNotes?: string;
  }): { success: boolean; subscription: PremiumSubscription } {
    const db = getDatabase();
    const details = this.getOrderByPublicId(params.publicOrderId);
    if (!details) {
      throw new Error('Order tidak ditemukan.');
    }

    const { order, plan } = details;
    const durationDays = Number(plan.duration_days) || 30;

    // 1. Update Order Status
    db.prepare(`
      UPDATE premium_orders 
      SET status = 'VERIFIED', updated_at = datetime('now')
      WHERE id = ?
    `).run(order.id);

    // 2. Update Payment Record
    db.prepare(`
      UPDATE premium_payments 
      SET verification_status = 'VERIFIED',
          verified_by = ?,
          verified_at = datetime('now'),
          updated_at = datetime('now')
      WHERE order_id = ?
    `).run(params.adminId, order.id);

    // 3. Create or update subscription
    const subId = `sub_${crypto.randomUUID()}`;
    db.prepare(`
      INSERT INTO premium_subscriptions (
        id, user_id, plan_id, order_id, status, started_at, expires_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now', '+${durationDays} days'), datetime('now'), datetime('now')
      )
    `).run(subId, order.user_id, plan.id, order.id);

    // 4. Also update users table subscription_status if user exists
    try {
      db.prepare(`
        UPDATE users 
        SET subscription_status = 'PREMIUM_ACTIVE', updated_at = datetime('now')
        WHERE id = ?
      `).run(order.user_id);
    } catch {}

    // 5. Log verification action and immutable audit trail
    db.prepare(`
      INSERT INTO payment_verification_logs (id, order_id, admin_id, action, notes, created_at)
      VALUES (?, ?, ?, 'APPROVED', ?, datetime('now'))
    `).run(`log_${crypto.randomUUID()}`, order.id, params.adminId, params.adminNotes || 'Payment verified and approved.');

    ModerationService.logAudit({
      actorId: params.adminId,
      actorRole: 'PAYMENT_ADMIN',
      action: 'PREMIUM_APPROVED',
      targetResource: 'premium_orders',
      targetId: order.id,
      details: `Approved order ${params.publicOrderId} for user ${order.user_id}. Plan: ${plan.name}. Notes: ${params.adminNotes || '-'}`,
    });

    const subscription = db.prepare('SELECT * FROM premium_subscriptions WHERE id = ?').get(subId) as unknown as PremiumSubscription;

    // Find linked support ticket and post system reply
    try {
      const ticket = db.prepare("SELECT id FROM support_tickets WHERE subject LIKE ?").get(`%${params.publicOrderId}%`) as { id: string } | undefined;
      if (ticket) {
        SupportService.sendMessage(
          ticket.id,
          'ADMIN',
          params.adminId,
          'NIVA Verification Admin',
          `Halo! Pembayaran QRIS Anda untuk pesanan ${params.publicOrderId} (${plan.name}) telah berhasil diverifikasi dan DISETUJUI oleh Admin. Langganan Premium Anda kini AKTIF hingga ${subscription.expires_at}.\n\nTerima kasih telah mendukung NIVA!`,
          false
        );
        SupportService.updateTicketStatus(ticket.id, 'RESOLVED', params.adminId);
      }
    } catch {}

    return { success: true, subscription };
  }

  /**
   * Admin rejects payment with required rejection reason
   */
  public static adminRejectOrder(params: {
    publicOrderId: string;
    adminId: string;
    rejectionReason: string;
  }): { success: boolean } {
    if (!params.rejectionReason || !params.rejectionReason.trim()) {
      throw new Error('Alasan penolakan (rejection reason) wajib dicantumkan.');
    }

    const db = getDatabase();
    const details = this.getOrderByPublicId(params.publicOrderId);
    if (!details) {
      throw new Error('Order tidak ditemukan.');
    }

    const { order } = details;

    db.prepare(`
      UPDATE premium_orders 
      SET status = 'REJECTED', updated_at = datetime('now')
      WHERE id = ?
    `).run(order.id);

    db.prepare(`
      UPDATE premium_payments 
      SET verification_status = 'REJECTED',
          verified_by = ?,
          verified_at = datetime('now'),
          rejection_reason = ?,
          updated_at = datetime('now')
      WHERE order_id = ?
    `).run(params.adminId, params.rejectionReason.trim(), order.id);

    db.prepare(`
      INSERT INTO payment_verification_logs (id, order_id, admin_id, action, notes, created_at)
      VALUES (?, ?, ?, 'REJECTED', ?, datetime('now'))
    `).run(`log_${crypto.randomUUID()}`, order.id, params.adminId, `Rejected: ${params.rejectionReason.trim()}`);

    ModerationService.logAudit({
      actorId: params.adminId,
      actorRole: 'PAYMENT_ADMIN',
      action: 'PREMIUM_REJECTED',
      targetResource: 'premium_orders',
      targetId: order.id,
      details: `Rejected order ${params.publicOrderId} for user ${order.user_id}. Reason: ${params.rejectionReason.trim()}`,
    });

    // Notify user in ticket
    try {
      const ticket = db.prepare("SELECT id FROM support_tickets WHERE subject LIKE ?").get(`%${params.publicOrderId}%`) as { id: string } | undefined;
      if (ticket) {
        SupportService.sendMessage(
          ticket.id,
          'ADMIN',
          params.adminId,
          'NIVA Verification Admin',
          `Halo, pembayaran Anda untuk pesanan ${params.publicOrderId} belum dapat diverifikasi dengan alasan:\n"${params.rejectionReason.trim()}".\n\nSilakan periksa kembali bukti pembayaran Anda atau balas pesan ini jika Anda memiliki pertanyaan.`,
          false
        );
        SupportService.updateTicketStatus(ticket.id, 'WAITING_FOR_USER', params.adminId);
      }
    } catch {}

    return { success: true };
  }

  /**
   * Check whether a given user has active premium entitlement
   */
  public static hasPremiumAccess(userId: string): boolean {
    if (!userId) return false;
    const db = getDatabase();
    const row = db.prepare(`
      SELECT count(*) as count 
      FROM premium_subscriptions 
      WHERE user_id = ? AND status = 'ACTIVE' AND datetime(expires_at) > datetime('now')
    `).get(userId) as { count: number } | undefined;

    return !!(row && Number(row.count) > 0);
  }

  /**
   * Retrieve full entitlement profile for a user
   */
  public static getUserEntitlement(userId: string): {
    isPremium: boolean;
    status: 'ACTIVE' | 'EXPIRED' | 'FREE';
    planName?: string;
    startedAt?: string;
    expiresAt?: string;
    daysRemaining?: number;
  } {
    if (!userId) {
      return { isPremium: false, status: 'FREE' };
    }

    const db = getDatabase();
    const sub = db.prepare(`
      SELECT ps.*, pp.name as plan_name
      FROM premium_subscriptions ps
      JOIN premium_plans pp ON ps.plan_id = pp.id
      WHERE ps.user_id = ?
      ORDER BY ps.created_at DESC LIMIT 1
    `).get(userId) as (PremiumSubscription & { plan_name: string }) | undefined;

    if (!sub) {
      return { isPremium: false, status: 'FREE' };
    }

    const now = new Date().getTime();
    const expiry = new Date(sub.expires_at).getTime();

    if (sub.status === 'ACTIVE' && expiry > now) {
      const daysRemaining = Math.max(0, Math.ceil((expiry - now) / (1000 * 3600 * 24)));
      return {
        isPremium: true,
        status: 'ACTIVE',
        planName: sub.plan_name,
        startedAt: sub.started_at,
        expiresAt: sub.expires_at,
        daysRemaining,
      };
    }

    return {
      isPremium: false,
      status: 'EXPIRED',
      planName: sub.plan_name,
      startedAt: sub.started_at,
      expiresAt: sub.expires_at,
      daysRemaining: 0,
    };
  }

  /**
   * Get queue of orders for admin review
   */
  public static getAdminQueue(statusFilter?: string): Array<{
    order: PremiumOrder;
    payment: PremiumPayment;
    plan: PremiumPlan;
    subscription?: PremiumSubscription | null;
  }> {
    const db = getDatabase();
    let query = `
      SELECT 
        po.id as ord_id, po.public_order_id, po.user_id, po.plan_id, po.amount, po.currency, po.status as ord_status, po.created_at as ord_created_at, po.updated_at as ord_updated_at,
        pp.id as pay_id, pp.payment_method, pp.paid_at, pp.proof_data, pp.user_note, pp.verification_status, pp.verified_by, pp.verified_at, pp.rejection_reason,
        pl.name as plan_name, pl.price as plan_price, pl.duration_days, pl.description as plan_description, pl.features as plan_features
      FROM premium_orders po
      JOIN premium_payments pp ON po.id = pp.order_id
      JOIN premium_plans pl ON po.plan_id = pl.id
    `;

    if (statusFilter && statusFilter !== 'ALL') {
      query += ` WHERE po.status = ? ORDER BY po.created_at DESC`;
      const rows = db.prepare(query).all(statusFilter) as any[];
      return rows.map(r => this.mapQueueRow(r));
    } else {
      query += ` ORDER BY po.created_at DESC`;
      const rows = db.prepare(query).all() as any[];
      return rows.map(r => this.mapQueueRow(r));
    }
  }

  private static mapQueueRow(r: any): any {
    return {
      order: {
        id: r.ord_id,
        public_order_id: r.public_order_id,
        user_id: r.user_id,
        plan_id: r.plan_id,
        amount: r.amount,
        currency: r.currency,
        status: r.ord_status,
        created_at: r.ord_created_at,
        updated_at: r.ord_updated_at,
      },
      payment: {
        id: r.pay_id,
        order_id: r.ord_id,
        payment_method: r.payment_method,
        amount: r.amount,
        paid_at: r.paid_at,
        proof_file_id: null,
        proof_data: r.proof_data,
        user_note: r.user_note,
        verification_status: r.verification_status,
        verified_by: r.verified_by,
        verified_at: r.verified_at,
        rejection_reason: r.rejection_reason,
        created_at: r.ord_created_at,
        updated_at: r.ord_updated_at,
      },
      plan: {
        id: r.plan_id,
        name: r.plan_name,
        price: r.plan_price,
        duration_days: r.duration_days,
        description: r.plan_description,
        features: r.plan_features,
        is_active: 1,
        created_at: '',
        updated_at: '',
      },
    };
  }
}
