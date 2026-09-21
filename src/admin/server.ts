import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';
import { getDatabase } from '../database/db.js';
import { ModerationService } from '../services/safety/moderationService.js';
import { AdminRole, ReportStatus } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import crypto from 'node:crypto';

// In-memory active session store (token -> Admin Session)
interface AdminSession {
  id: string;
  username: string;
  displayName: string;
  role: AdminRole;
  expiresAt: number;
}
const activeSessions = new Map<string, AdminSession>();

export function createAdminApp(): express.Application {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  // Session Authentication & RBAC Middleware
  const requireRole = (allowedRoles: AdminRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'UNAUTHORIZED: Silakan login terlebih dahulu' });
        return;
      }

      const token = authHeader.split(' ')[1];

      // Support master API key for tests or direct script access
      if (token === config.ADMIN_API_KEY) {
        (req as any).adminUser = { id: 'admin-super-01', username: 'superadmin', role: 'SUPER_ADMIN', displayName: 'Head Admin' };
        next();
        return;
      }

      const session = activeSessions.get(token);
      if (!session || session.expiresAt < Date.now()) {
        if (session) activeSessions.delete(token);
        res.status(401).json({ error: 'UNAUTHORIZED: Sesi Anda telah berakhir, silakan login kembali' });
        return;
      }

      if (!allowedRoles.includes(session.role) && session.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: `FORBIDDEN: Peran ${session.role} tidak memiliki hak akses untuk fungsi ini` });
        return;
      }

      (req as any).adminUser = session;
      next();
    };
  };

  // --- AUTHENTICATION ENDPOINTS ---

  // POST /api/auth/login
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username dan password wajib diisi' });
      return;
    }

    const db = getDatabase();
    const hash = crypto.createHash('sha256').update(password).digest('hex');

    const admin = db.prepare('SELECT * FROM admin_users WHERE username = ? AND password_hash = ? AND is_active = 1').get(username, hash) as any;

    if (!admin) {
      // Log suspicious login failure
      ModerationService.logSecurityEvent('ADMIN_LOGIN_FAILED', 'MEDIUM', `Failed admin login attempt for username: ${username}`, undefined, req.ip);
      res.status(401).json({ error: 'Username atau password salah' });
      return;
    }

    // Generate cryptographically secure session token (valid 24 hours)
    const token = crypto.randomBytes(32).toString('hex');
    const session: AdminSession = {
      id: admin.id,
      username: admin.username,
      displayName: admin.display_name,
      role: admin.role as AdminRole,
      expiresAt: Date.now() + 24 * 3600 * 1000,
    };
    activeSessions.set(token, session);

    ModerationService.logAudit({
      actorId: admin.id,
      actorRole: admin.role,
      action: 'ADMIN_LOGIN_SUCCESS',
      targetResource: 'admin_users',
      targetId: admin.id,
      details: `Admin ${admin.username} logged in successfully`,
      ipAddress: req.ip,
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

  // 1. Dashboard Metrics Summary
  app.get('/api/metrics', requireRole(['SUPER_ADMIN', 'VERIFICATION_REVIEWER', 'MODERATOR', 'AUDITOR']), (req: Request, res: Response) => {
    const db = getDatabase();

    const usersCount = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'ACTIVE'").get() as any).count;
    const pendingVerifs = (db.prepare("SELECT COUNT(*) as count FROM student_verifications WHERE status = 'NEEDS_REVIEW'").get() as any).count;
    const totalVerifs = (db.prepare("SELECT COUNT(*) as count FROM student_verifications WHERE status = 'VERIFIED'").get() as any).count;
    const openReports = (db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'OPEN'").get() as any).count;
    const activeMatches = (db.prepare("SELECT COUNT(*) as count FROM matches WHERE is_active = 1").get() as any).count;

    const settings = db.prepare('SELECT * FROM system_settings').all() as any[];
    const switches = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value === 'true';
      return acc;
    }, {} as Record<string, boolean>);

    res.json({
      activeStudents: usersCount,
      pendingVerifications: pendingVerifs,
      totalVerifiedKTM: totalVerifs,
      openReports,
      activeMatches,
      switches,
    });
  });

  // 2. Verification Queue (VERIFICATION_REVIEWER, SUPER_ADMIN)
  app.get('/api/verifications', requireRole(['VERIFICATION_REVIEWER', 'SUPER_ADMIN']), (req: Request, res: Response) => {
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
  });

  // 3. Resolve Verification (Approve / Reject)
  app.post('/api/verifications/:id/resolve', requireRole(['VERIFICATION_REVIEWER', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { action, notes } = req.body; // action: 'APPROVE' | 'REJECT'
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

      db.prepare("UPDATE users SET status = 'ACTIVE', updated_at = datetime('now') WHERE id = ?").run(verif.user_id);
    } else {
      db.prepare(`
        UPDATE student_verifications 
        SET status = 'REJECTED', review_notes = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(notes || 'Rejected by human reviewer', id);
    }

    ModerationService.logAudit({
      actorId: (req as any).adminUser.id,
      actorRole: (req as any).adminUser.role,
      action: `VERIFICATION_${action}`,
      targetResource: 'student_verifications',
      targetId: id,
      details: `User ${verif.user_id} verification ${action}. Notes: ${notes}`,
    });

    res.json({ success: true, newStatus: action === 'APPROVE' ? 'VERIFIED' : 'REJECTED' });
  });

  // 4. Reports Queue (MODERATOR, SUPER_ADMIN)
  // Section 18: Moderator must NOT automatically have access to raw KTM documents!
  app.get('/api/reports', requireRole(['MODERATOR', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const reports = ModerationService.getReports(status as ReportStatus | undefined);
    res.json({ reports });
  });

  // 5. Resolve Report Case
  app.post('/api/reports/:id/resolve', requireRole(['MODERATOR', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { action, notes } = req.body; // 'WARN' | 'SUSPEND' | 'BAN' | 'DISMISS'

    try {
      ModerationService.resolveReport(id, (req as any).adminUser.id, action, notes || 'Resolved via admin console');
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // 6. Emergency Killswitches (SUPER_ADMIN Only)
  app.post('/api/emergency/toggle', requireRole(['SUPER_ADMIN']), (req: Request, res: Response) => {
    const { key, enabled } = req.body;
    if (!['registrations_enabled', 'matchmaking_enabled', 'verification_enabled'].includes(key)) {
      res.status(400).json({ error: 'Invalid switch key' });
      return;
    }

    ModerationService.toggleSystemSetting(key, enabled === true, (req as any).adminUser.id);
    res.json({ success: true, key, enabled });
  });

  // 7. Audit Logs Explorer (AUDITOR, SUPER_ADMIN)
  app.get('/api/audit-logs', requireRole(['AUDITOR', 'SUPER_ADMIN']), (req: Request, res: Response) => {
    const db = getDatabase();
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
    res.json({ auditLogs: logs });
  });

  return app;
}

export function startAdminServer(): void {
  const app = createAdminApp();
  app.listen(config.ADMIN_PORT, config.ADMIN_HOST, () => {
    console.log(`🛡️ SULA Admin & Incident Response Console active at http://${config.ADMIN_HOST}:${config.ADMIN_PORT}`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startAdminServer();
}
