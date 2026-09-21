import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { config } from '../config/index.js';
import { getDatabase } from '../database/db.js';
import { ModerationService } from '../services/safety/moderationService.js';
import { StatisticsService } from '../services/stats/statisticsService.js';
import { PaymentService } from '../services/payment/paymentService.js';
import { PhotoVerificationService } from '../services/verification/photoVerificationService.js';
import { MatchingService } from '../services/matchmaking/matchingService.js';
import { AdminRole } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory active session store (token -> Admin Session)
interface AdminSession {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  expiresAt: number;
}
const activeSessions = new Map<string, AdminSession>();

export function createAdminServer() {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Serve static assets from admin/public
  const publicDir = path.join(__dirname, 'public');
  if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
  }

  // ==========================================
  // 1. PUBLIC API ENDPOINTS (No Auth Required)
  // ==========================================

  // GET /api/public/stats — Public aggregate statistics (Section 33)
  app.get('/api/public/stats', (req: Request, res: Response) => {
    try {
      const stats = StatisticsService.getPublicStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch public statistics' });
    }
  });

  // GET /api/plans — Public available subscription plans (Section 11)
  app.get('/api/plans', (req: Request, res: Response) => {
    try {
      const plans = PaymentService.getPlans();
      res.json({ plans });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
  });

  // POST /api/payments/create — Create payment request from website (Section 12 & 13)
  app.post('/api/payments/create', (req: Request, res: Response) => {
    try {
      const { userId, planId, paymentMethod } = req.body;
      if (!userId || !planId) {
        res.status(400).json({ error: 'userId and planId are required' });
        return;
      }
      const payment = PaymentService.createPaymentRequest(userId, planId, paymentMethod || 'QRIS');
      res.json({ success: true, payment });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/payments/:id/proof — Submit payment proof (base64 image)
  app.post('/api/payments/:id/proof', async (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id as string;
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: 'imageBase64 is required' });
        return;
      }
      const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');

      await PaymentService.submitPaymentProof(paymentId, buffer);
      res.json({ success: true, message: 'Bukti pembayaran berhasil diunggah dan masuk antrean peninjauan admin.' });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // GET /api/payments/:id — Check status of a payment request
  app.get('/api/payments/:id', (req: Request, res: Response) => {
    const db = getDatabase();
    const payment = db.prepare(`
      SELECT pr.*, sp.name as plan_name, sp.badge_label 
      FROM payment_requests pr
      JOIN subscription_plans sp ON sp.id = pr.plan_id
      WHERE pr.id = ?
    `).get(req.params.id as string);

    if (!payment) {
      res.status(404).json({ error: 'Payment request not found' });
      return;
    }
    res.json({ payment });
  });

  // ==========================================
  // 2. AUTHENTICATION & RBAC MIDDLEWARE
  // ==========================================

  const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'UNAUTHORIZED: Silakan login terlebih dahulu' });
        return;
      }

      const token = authHeader.split(' ')[1];

      // Support master API key for tests or internal script access
      if (token === config.ADMIN_API_KEY) {
        (req as any).adminUser = {
          id: 'admin-super-01',
          username: 'superadmin',
          role: 'SUPER_ADMIN',
          displayName: 'Head Admin',
        };
        next();
        return;
      }

      const session = activeSessions.get(token);
      if (!session || session.expiresAt < Date.now()) {
        if (session) activeSessions.delete(token);
        res.status(401).json({ error: 'UNAUTHORIZED: Sesi Anda telah berakhir, silakan login kembali' });
        return;
      }

      const isAllowed = allowedRoles.includes(session.role) || session.role === 'SUPER_ADMIN';
      if (!isAllowed) {
        res.status(403).json({ error: `FORBIDDEN: Peran ${session.role} tidak memiliki hak akses untuk fungsi ini` });
        return;
      }

      (req as any).adminUser = session;
      next();
    };
  };

  // POST /api/auth/login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username dan password wajib diisi' });
      return;
    }

    const db = getDatabase();
    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ? AND is_active = 1').get(username) as any;

    if (!admin) {
      res.status(401).json({ error: 'Kredensial login tidak valid' });
      return;
    }

    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    if (inputHash !== admin.password_hash && password !== config.ADMIN_API_KEY) {
      res.status(401).json({ error: 'Kredensial login tidak valid' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    activeSessions.set(token, {
      id: admin.id,
      username: admin.username,
      displayName: admin.display_name,
      role: admin.role,
      expiresAt: Date.now() + 12 * 3600 * 1000,
    });

    res.json({
      success: true,
      token,
      user: {
        id: admin.id,
        username: admin.username,
        displayName: admin.display_name,
        role: admin.role,
      },
    });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const token = authHeader.split(' ')[1];
    const session = activeSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      res.status(401).json({ authenticated: false });
      return;
    }
    res.json({ authenticated: true, user: session });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      activeSessions.delete(token);
    }
    res.json({ success: true });
  });

  // ==========================================
  // 3. ADMIN OPERATIONS & DASHBOARD APIS
  // ==========================================

  // GET /api/metrics & /api/admin/metrics (Unified Dashboard Overview - Section 40)
  const getMetricsHandler = (req: Request, res: Response) => {
    const db = getDatabase();

    const stats = StatisticsService.getPublicStats();
    const activeUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'ACTIVE'").get() as any).count;
    const photoVerified = (db.prepare("SELECT COUNT(*) as count FROM users WHERE verification_status = 'PHOTO_VERIFIED'").get() as any).count;
    const ktmVerified = (db.prepare("SELECT COUNT(*) as count FROM users WHERE verification_status = 'KTM_VERIFIED'").get() as any).count;
    const freeUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'FREE'").get() as any).count;
    const premiumUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'PREMIUM_ACTIVE'").get() as any).count;

    const pendingKtm = (db.prepare("SELECT COUNT(*) as count FROM student_verifications WHERE status IN ('NEEDS_REVIEW', 'PENDING')").get() as any).count;
    const pendingPhoto = (db.prepare("SELECT COUNT(*) as count FROM photo_verifications WHERE status = 'PHOTO_PENDING'").get() as any).count;
    const pendingPayments = (db.prepare("SELECT COUNT(*) as count FROM payment_requests WHERE status IN ('UNDER_REVIEW', 'PROOF_SUBMITTED')").get() as any).count;
    const openReports = (db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'OPEN'").get() as any).count;
    const openTickets = (db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status = 'WAITING'").get() as any).count;

    const settings = db.prepare('SELECT * FROM system_settings').all() as any[];
    const switches = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    res.json({
      totalJoined: stats.studentsJoined,
      activeUsers,
      photoVerified,
      ktmVerified,
      freeUsers,
      premiumUsers,
      pendingKtm,
      pendingPhoto,
      pendingPayments,
      openReports,
      openTickets,
      switches,
    });
  };

  app.get('/api/metrics', requireRole(['SUPER_ADMIN', 'PAYMENT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR', 'SUPPORT_ADMIN', 'AUDITOR', 'VERIFICATION_REVIEWER']), getMetricsHandler);
  app.get('/api/admin/metrics', requireRole(['SUPER_ADMIN', 'PAYMENT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR', 'SUPPORT_ADMIN', 'AUDITOR', 'VERIFICATION_REVIEWER']), getMetricsHandler);

  // GET /api/admin/users — All Active Users Directory with search & filters (Section 21 & 23)
  app.get('/api/admin/users', requireRole(['SUPER_ADMIN', 'PAYMENT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR', 'SUPPORT_ADMIN', 'AUDITOR']), (req: Request, res: Response) => {
    const db = getDatabase();
    const query = (req.query.q as string || '').trim().toLowerCase();
    const filter = (req.query.filter as string || 'ALL').toUpperCase();

    let sql = `
      SELECT 
        u.id as user_id,
        u.status as account_status,
        u.verification_status,
        u.subscription_status,
        u.risk_score,
        u.created_at as joined_date,
        p.display_name,
        p.age,
        p.study_field,
        p.coarse_area,
        i.name as institution_name,
        i.short_name as institution_short_name,
        (SELECT COUNT(*) FROM reports WHERE reported_id = u.id) as report_count,
        COALESCE(dlu.like_count, 0) as daily_likes_used
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN institutions i ON i.id = p.institution_id
      LEFT JOIN daily_like_usage dlu ON dlu.user_id = u.id AND dlu.usage_date = date('now')
      WHERE u.status != 'DELETED'
    `;

    const params: any[] = [];

    if (query) {
      sql += ` AND (LOWER(p.display_name) LIKE ? OR LOWER(i.name) LIKE ? OR LOWER(i.short_name) LIKE ? OR u.id LIKE ?)`;
      params.push(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);
    }

    if (filter === 'UNVERIFIED') sql += ` AND u.verification_status = 'UNVERIFIED'`;
    else if (filter === 'PHOTO_VERIFIED') sql += ` AND u.verification_status = 'PHOTO_VERIFIED'`;
    else if (filter === 'KTM_VERIFIED') sql += ` AND u.verification_status = 'KTM_VERIFIED'`;
    else if (filter === 'PREMIUM') sql += ` AND u.subscription_status = 'PREMIUM_ACTIVE'`;
    else if (filter === 'FREE') sql += ` AND u.subscription_status = 'FREE'`;
    else if (filter === 'SUSPENDED') sql += ` AND u.status = 'SUSPENDED'`;

    sql += ` ORDER BY u.created_at DESC LIMIT 100`;

    const rows = db.prepare(sql).all(...params);

    const enriched = rows.map((r: any) => {
      const limit = MatchingService.getUserDailyLikeAllowance(r.user_id);
      return {
        ...r,
        daily_like_limit: limit,
      };
    });

    res.json({ users: enriched });
  });

  // ==========================================
  // 4. VERIFICATION QUEUES (FIFO) — KTM & PHOTO
  // ==========================================

  // GET /api/verifications & /api/admin/verifications/ktm (KTM Review Queue)
  const getKtmQueueHandler = (req: Request, res: Response) => {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        sv.id as verification_id,
        sv.user_id,
        sv.status,
        sv.ocr_extracted_text,
        sv.ocr_confidence,
        sv.review_notes,
        sv.created_at,
        i.name as institution_name,
        i.short_name as institution_short_name,
        p.display_name,
        p.age,
        p.study_field
      FROM student_verifications sv
      JOIN institutions i ON i.id = sv.institution_id
      LEFT JOIN profiles p ON p.user_id = sv.user_id
      WHERE sv.status IN ('NEEDS_REVIEW', 'PENDING')
      ORDER BY sv.created_at ASC
    `).all();

    res.json({ verifications: rows });
  };

  app.get('/api/verifications', requireRole(['VERIFICATION_REVIEWER', 'VERIFICATION_ADMIN', 'SUPER_ADMIN']), getKtmQueueHandler);
  app.get('/api/admin/verifications/ktm', requireRole(['VERIFICATION_REVIEWER', 'VERIFICATION_ADMIN', 'SUPER_ADMIN']), getKtmQueueHandler);

  // View temporary KTM image
  app.get('/api/verifications/:id/image', requireRole(['VERIFICATION_REVIEWER', 'VERIFICATION_ADMIN', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const id = req.params.id as string;
    const filePath = path.join(config.UPLOADS_DIR, `ktm_review_${id}.webp`);
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'image/webp');
      res.sendFile(filePath);
    } else {
      res.status(404).json({ error: 'Foto KTM tidak ditemukan atau sudah dihapus sesuai batas retensi privasi' });
    }
  });

  // POST /api/verifications/:id/resolve & /api/admin/verifications/ktm/:id/resolve
  const resolveKtmHandler = (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { action, notes } = req.body;
    const db = getDatabase();

    const verif = db.prepare('SELECT * FROM student_verifications WHERE id = ?').get(id) as any;
    if (!verif) {
      res.status(404).json({ error: 'Verification record not found' });
      return;
    }

    if (action === 'APPROVE') {
      db.prepare(`
        UPDATE student_verifications 
        SET status = 'VERIFIED', review_notes = ?, verified_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(notes || 'Approved by human reviewer', id);

      db.prepare("UPDATE users SET status = 'ACTIVE', verification_status = 'KTM_VERIFIED', updated_at = datetime('now') WHERE id = ?").run(verif.user_id);
    } else {
      db.prepare(`
        UPDATE student_verifications 
        SET status = 'REJECTED', review_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(notes || 'Rejected by human reviewer', id);

      db.prepare("UPDATE users SET verification_status = 'VERIFICATION_REJECTED', updated_at = datetime('now') WHERE id = ?").run(verif.user_id);
    }

    ModerationService.logAudit({
      actorId: (req as any).adminUser.id,
      actorRole: (req as any).adminUser.role,
      action: `VERIFICATION_${action}`,
      targetResource: 'student_verifications',
      targetId: id,
      details: `User ${verif.user_id} KTM verification ${action}. Notes: ${notes}`,
    });

    res.json({ success: true });
  };

  app.post('/api/verifications/:id/resolve', requireRole(['VERIFICATION_REVIEWER', 'VERIFICATION_ADMIN', 'SUPER_ADMIN']), resolveKtmHandler);
  app.post('/api/admin/verifications/ktm/:id/resolve', requireRole(['VERIFICATION_REVIEWER', 'VERIFICATION_ADMIN', 'SUPER_ADMIN']), resolveKtmHandler);

  // GET /api/admin/verifications/photo (Photo Review Queue - FIFO - Section 24 & 25)
  app.get('/api/admin/verifications/photo', requireRole(['VERIFICATION_ADMIN', 'VERIFICATION_REVIEWER', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    try {
      const queue = PhotoVerificationService.getPhotoQueue();
      res.json({ verifications: queue });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/admin/verifications/photo/:id/resolve (Resolve Photo Verification)
  app.post('/api/admin/verifications/photo/:id/resolve', requireRole(['VERIFICATION_ADMIN', 'VERIFICATION_REVIEWER', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { action, notes } = req.body;
      PhotoVerificationService.resolvePhotoVerification(id, action, (req as any).adminUser.id, notes);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 5. PAYMENT VERIFICATION QUEUE (FIFO)
  // ==========================================

  // GET /api/admin/payments (FIFO Payment Review Queue - Section 15 & 16)
  app.get('/api/admin/payments', requireRole(['PAYMENT_ADMIN', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    try {
      const queue = PaymentService.getPaymentQueue();
      res.json({ payments: queue });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/admin/payments/:id/proof (Secure payment proof viewer)
  app.get('/api/admin/payments/:id/proof', requireRole(['PAYMENT_ADMIN', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const paymentId = req.params.id as string;
    const proofPath = path.join(config.UPLOADS_DIR, 'payments', `proof_${paymentId}.webp`);
    if (fs.existsSync(proofPath)) {
      res.setHeader('Content-Type', 'image/webp');
      res.sendFile(proofPath);
    } else {
      res.status(404).json({ error: 'Bukti pembayaran tidak ditemukan' });
    }
  });

  // POST /api/admin/payments/:id/resolve (Transactional Approval/Rejection - Section 17)
  app.post('/api/admin/payments/:id/resolve', requireRole(['PAYMENT_ADMIN', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    try {
      const paymentId = req.params.id as string;
      const { action, notes } = req.body;
      PaymentService.resolvePayment(paymentId, action, (req as any).adminUser.id, notes);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST /api/admin/users/:id/grant-premium (Super-admin promotional premium - Section 20 & 22)
  app.post('/api/admin/users/:id/grant-premium', requireRole(['SUPER_ADMIN']), (req: Request, res: Response) => {
    try {
      const userId = req.params.id as string;
      const { durationDays, reason } = req.body;
      PaymentService.grantPromotionalPremium(userId, durationDays || 30, (req as any).adminUser.id, reason);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // ==========================================
  // 6. SUPPORT TICKETS QUEUE & AUDIT LOGS
  // ==========================================

  // GET /api/admin/support/tickets (Support Chat Queue - Section 28)
  app.get('/api/admin/support/tickets', requireRole(['SUPPORT_ADMIN', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT st.*, p.display_name, i.short_name as institution_short_name
      FROM support_tickets st
      LEFT JOIN profiles p ON p.user_id = st.user_id
      LEFT JOIN institutions i ON i.id = p.institution_id
      ORDER BY 
        CASE WHEN st.status = 'WAITING' THEN 0 ELSE 1 END ASC,
        st.created_at ASC
    `).all();

    res.json({ tickets: rows });
  });

  // GET /api/admin/audit-logs (Immutable audit logs - Section 37)
  app.get('/api/admin/audit-logs', requireRole(['AUDITOR', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT * FROM audit_logs 
      ORDER BY created_at DESC 
      LIMIT 200
    `).all();

    res.json({ logs: rows });
  });

  // System Settings Toggle (Kill switches / pricing phase)
  app.post('/api/settings/toggle', requireRole(['SUPER_ADMIN']), (req: Request, res: Response) => {
    const { key, value } = req.body;
    if (!key || value === undefined) {
      res.status(400).json({ error: 'Key and value are required' });
      return;
    }

    ModerationService.toggleSystemSetting(key, value.toString(), (req as any).adminUser.id);
    res.json({ success: true, key, value });
  });

  return app;
}

export function startAdminServer(port = config.ADMIN_PORT, host = config.ADMIN_HOST) {
  const app = createAdminServer();
  return app.listen(port, host, () => {
    console.log(`🛡️ NIVA Admin & Incident Response Console active at http://${host}:${port}`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startAdminServer();
}
