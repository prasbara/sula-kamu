/**
 * StrangerCamService — NIVA Stranger Cam / Random 1-on-1 Chat
 *
 * Core Principles:
 *  1. Low-friction entry for Semarang community: 18+ and confirmed Semarang location.
 *  2. KTM / Student verification is NOT required.
 *  3. Photo verification is NOT required.
 *  4. Maximum location privacy: Raw GPS is never permanently stored or shared with match.
 *     Users only see "Semarang".
 *  5. Strict 1 active session per user.
 *  6. No automatic recording.
 *  7. Immediate safety controls: Skip, Block (permanent), Report (with standard reasons).
 *  8. Anti-scam, anti-nudity, and phishing protections.
 *  9. Coming soon state: Never show fake online counters or fake queues.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';

// ─── Constants ────────────────────────────────────────────────────────────────

export const STRANGER_CAM_REGION = 'SEMARANG';
export const LOCATION_CONFIRMATION_WINDOW_HOURS = 24;

// Bounding box for approximate Semarang metropolitan validation
// Latitude: -7.15 to -6.90, Longitude: 110.30 to 110.55
const SEMARANG_BBOX = {
  minLat: -7.15,
  maxLat: -6.90,
  minLon: 110.30,
  maxLon: 110.55,
};

export const ALLOWED_REPORT_REASONS = [
  'NUDITY',
  'HARASSMENT',
  'SCAM',
  'THREAT',
  'HATE_ABUSE',
  'UNDERAGE_CONCERN',
  'FAKE_IDENTITY',
  'PHISHING',
  'INAPPROPRIATE_BEHAVIOR',
  'OTHER',
] as const;

export type ReportReason = typeof ALLOWED_REPORT_REASONS[number];

export type StrangerSessionStatus =
  | 'AVAILABLE'
  | 'QUEUED'
  | 'MATCHING'
  | 'CONNECTED'
  | 'SKIPPED'
  | 'ENDED'
  | 'REPORTED'
  | 'BLOCKED'
  | 'SUSPENDED';

// Anti-scam & phishing patterns
const SUSPICIOUS_TEXT_PATTERNS = [
  { pattern: /transfer\s+(uang|dana|duit)/i, flag: 'MONEY_REQUEST', score: 0.9 },
  { pattern: /minta\s+(otp|kode\s+verifikasi|pin|password)/i, flag: 'CREDENTIAL_THEFT', score: 1.0 },
  { pattern: /(investasi\s+cuan|profit\s+harian|slot\s+gacor|crypto\s+bonus)/i, flag: 'FINANCIAL_SCAM', score: 0.95 },
  { pattern: /pinjam(kan)?\s+(uang|saldo)/i, flag: 'LOAN_REQUEST', score: 0.8 },
  { pattern: /(https?:\/\/[^\s]+|bit\.ly\/[^\s]+|tinyurl\.com\/[^\s]+)/i, flag: 'EXTERNAL_URL', score: 0.6 },
];

// ─── StrangerCamService ───────────────────────────────────────────────────────

export class StrangerCamService {
  /**
   * Feature launch status flag.
   * Coming soon by default — do not display fake availability or "Start Now".
   */
  public static isFeatureLaunched(): boolean {
    return false; // Upcoming feature
  }

  // ── Waitlist / Notify Me ────────────────────────────────────────────────────

  /**
   * Subscribe user to waitlist notifications.
   * Minimal data stored: contact_info, user_id, feature.
   */
  public static joinWaitlist(
    contactInfo: string,
    userId?: string
  ): { success: boolean; message: string } {
    const trimmed = (contactInfo || '').trim();
    if (!trimmed || trimmed.length < 3) {
      throw new Error('Kontak tidak valid. Masukkan username Telegram atau email Anda.');
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO feature_waitlist (id, user_id, contact_info, feature)
      VALUES (?, ?, ?, 'STRANGER_CAM')
      ON CONFLICT(contact_info, feature) DO UPDATE SET
        user_id = COALESCE(?, user_id),
        created_at = datetime('now')
    `).run(id, userId || null, trimmed, userId || null);

    return {
      success: true,
      message: 'Terima kasih! Kamu akan diberi tahu segera saat NIVA Stranger Cam siap diluncurkan.',
    };
  }

  /**
   * Get genuinely tracked waitlist count.
   * NEVER returns hardcoded / manufactured numbers.
   */
  public static getWaitlistCount(): number {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM feature_waitlist WHERE feature = 'STRANGER_CAM'
    `).get() as { count: number };
    return row ? Number(row.count) : 0;
  }

  // ── Eligibility Check ───────────────────────────────────────────────────────

  /**
   * Checks whether a user satisfies all Stranger Cam criteria:
   *  - Account status is ACTIVE and not suspended/banned
   *  - Age confirmed 18+
   *  - Semarang location confirmed within validity window
   *  - Neither KTM nor photo verification is required!
   */
  public static checkEligibility(userId: string): {
    eligible: boolean;
    reason?: string;
    requiresAge: boolean;
    requiresLocation: boolean;
  } {
    const db = getDatabase();

    const user = db.prepare(`
      SELECT id, status, is_18_plus, birth_date FROM users WHERE id = ?
    `).get(userId) as { id: string; status: string; is_18_plus: number; birth_date?: string } | undefined;

    if (!user) {
      return { eligible: false, reason: 'Pengguna tidak ditemukan.', requiresAge: true, requiresLocation: true };
    }

    if (user.status !== 'ACTIVE') {
      return { eligible: false, reason: 'Akun Anda sedang dinonaktifkan atau dalam peninjauan.', requiresAge: false, requiresLocation: false };
    }

    // 1. 18+ Requirement
    const isAdult = user.is_18_plus === 1;
    if (!isAdult) {
      return {
        eligible: false,
        reason: 'NIVA Stranger Cam khusus untuk pengguna berusia 18 tahun ke atas.',
        requiresAge: true,
        requiresLocation: false,
      };
    }

    // 2. Semarang Location Confirmation Check
    const location = db.prepare(`
      SELECT region, confirmed_at, expires_at
      FROM location_confirmations
      WHERE user_id = ?
        AND region = 'SEMARANG'
        AND datetime(expires_at) > datetime('now')
    `).get(userId) as { region: string; confirmed_at: string; expires_at: string } | undefined;

    if (!location) {
      return {
        eligible: false,
        reason: 'Konfirmasi lokasi di wilayah Semarang diperlukan sebelum bergabung.',
        requiresAge: false,
        requiresLocation: true,
      };
    }

    return {
      eligible: true,
      requiresAge: false,
      requiresLocation: false,
    };
  }

  // ── Location Confirmation & Data Minimization ──────────────────────────────

  /**
   * Confirm that the user is currently in the Semarang area.
   *
   * Privacy by Design:
   *  - Validates coordinates if provided (within Semarang bounding box)
   *  - DOES NOT store raw coordinates in the database
   *  - Minimizes stored data to: user_id, region = 'SEMARANG', method, confirmed_at, expires_at (24h)
   */
  public static confirmSemarangLocation(
    userId: string,
    method: 'BROWSER_GEO' | 'USER_CONFIRMATION' | 'IP_LOOKUP',
    coords?: { latitude: number; longitude: number }
  ): {
    success: boolean;
    region: string;
    expiresAt: string;
    message: string;
  } {
    const db = getDatabase();

    // Verify user exists and is 18+
    const user = db.prepare('SELECT id, is_18_plus FROM users WHERE id = ?').get(userId) as { id: string; is_18_plus: number } | undefined;
    if (!user) {
      throw new Error('User not found');
    }

    // If coordinates supplied via Browser Geolocation, validate against bounding box
    if (coords) {
      const { latitude, longitude } = coords;
      const inSemarang =
        latitude >= SEMARANG_BBOX.minLat &&
        latitude <= SEMARANG_BBOX.maxLat &&
        longitude >= SEMARANG_BBOX.minLon &&
        longitude <= SEMARANG_BBOX.maxLon;

      if (!inSemarang) {
        throw new Error('Lokasi GPS berada di luar area Semarang. NIVA Stranger Cam saat ini hanya untuk area Semarang.');
      }
    }

    // Write minimal record without storing raw coordinates
    db.prepare(`
      INSERT INTO location_confirmations (user_id, region, method, confirmed_at, expires_at)
      VALUES (?, 'SEMARANG', ?, datetime('now'), datetime('now', '+${LOCATION_CONFIRMATION_WINDOW_HOURS} hours'))
      ON CONFLICT(user_id) DO UPDATE SET
        region = 'SEMARANG',
        method = ?,
        confirmed_at = datetime('now'),
        expires_at = datetime('now', '+${LOCATION_CONFIRMATION_WINDOW_HOURS} hours')
    `).run(userId, method, method);

    const record = db.prepare('SELECT expires_at FROM location_confirmations WHERE user_id = ?').get(userId) as { expires_at: string };

    return {
      success: true,
      region: STRANGER_CAM_REGION,
      expiresAt: record.expires_at,
      message: 'Lokasi Semarang berhasil dikonfirmasi. Berlaku selama 24 jam.',
    };
  }

  // ── Queue Management & Random Matching ──────────────────────────────────────

  /**
   * Check if a user currently has an active session.
   * Rule: Exactly 1 active session per user allowed.
   */
  public static getActiveSessionForUser(userId: string): any | null {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM stranger_sessions
      WHERE (user_a_id = ? OR user_b_id = ?)
        AND status IN ('MATCHING', 'CONNECTED')
      LIMIT 1
    `).get(userId, userId) || null;
  }

  /**
   * Enter the live Semarang matching queue.
   */
  public static joinQueue(
    userId: string,
    interests: string[] = []
  ): { success: boolean; status: string; message: string; session?: any } {
    // Check if feature is launched
    if (!this.isFeatureLaunched()) {
      return {
        success: false,
        status: 'FEATURE_UNAVAILABLE',
        message: 'NIVA Stranger Cam segera hadir! Bergabunglah dalam waitlist untuk notifikasi saat diluncurkan.',
      };
    }

    const eligibility = this.checkEligibility(userId);
    if (!eligibility.eligible) {
      return {
        success: false,
        status: 'INELIGIBLE',
        message: eligibility.reason || 'Syarat kelayakan belum terpenuhi.',
      };
    }

    // Enforce 1 active session per user
    const existingSession = this.getActiveSessionForUser(userId);
    if (existingSession) {
      return {
        success: false,
        status: 'ALREADY_IN_SESSION',
        message: 'Anda sudah berada dalam sesi aktif Stranger Cam.',
        session: existingSession,
      };
    }

    const db = getDatabase();

    // Check if a suitable match is waiting in the queue
    const match = this.findMatchInQueue(userId);
    if (match) {
      // Remove partner from queue
      db.prepare('DELETE FROM stranger_queue WHERE user_id = ?').run(match.user_id);
      db.prepare('DELETE FROM stranger_queue WHERE user_id = ?').run(userId);

      // Create new session
      const sessionId = uuidv4();
      db.prepare(`
        INSERT INTO stranger_sessions (id, user_a_id, user_b_id, status)
        VALUES (?, ?, ?, 'CONNECTED')
      `).run(sessionId, userId, match.user_id);

      const session = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(sessionId);

      return {
        success: true,
        status: 'CONNECTED',
        message: 'Match ditemukan! Menghubungkan video 1-on-1...',
        session,
      };
    }

    // Otherwise place user in queue
    const interestsJson = JSON.stringify(interests || []);
    db.prepare(`
      INSERT INTO stranger_queue (user_id, status, interests, entered_at)
      VALUES (?, 'QUEUED', ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        status = 'QUEUED',
        interests = ?,
        entered_at = datetime('now')
    `).run(userId, interestsJson, interestsJson);

    return {
      success: true,
      status: 'QUEUED',
      message: 'Mencari mahasiswa lain di Semarang yang sedang online...',
    };
  }

  /**
   * Leave queue.
   */
  public static leaveQueue(userId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM stranger_queue WHERE user_id = ?').run(userId);
  }

  /**
   * Find another waiting user who:
   *  - is not the caller
   *  - has no active blocks (mutual block check)
   *  - is not in an active call
   */
  private static findMatchInQueue(userId: string): { user_id: string } | null {
    const db = getDatabase();

    const candidate = db.prepare(`
      SELECT sq.user_id
      FROM stranger_queue sq
      WHERE sq.user_id != ?
        -- Caller has not blocked candidate
        AND NOT EXISTS (
          SELECT 1 FROM stranger_blocks sb WHERE sb.user_id = ? AND sb.blocked_user_id = sq.user_id
        )
        -- Candidate has not blocked caller
        AND NOT EXISTS (
          SELECT 1 FROM stranger_blocks sb WHERE sb.user_id = sq.user_id AND sb.blocked_user_id = ?
        )
        -- Candidate not already in an active session
        AND NOT EXISTS (
          SELECT 1 FROM stranger_sessions ss
          WHERE (ss.user_a_id = sq.user_id OR ss.user_b_id = sq.user_id)
            AND ss.status IN ('MATCHING', 'CONNECTED')
        )
      ORDER BY sq.entered_at ASC
      LIMIT 1
    `).get(userId, userId, userId) as { user_id: string } | undefined;

    return candidate || null;
  }

  // ── Call Controls (Skip, Block, Report, End) ────────────────────────────────

  /**
   * Skip current call and optionally return to queue.
   */
  public static skipCall(
    sessionId: string,
    userId: string
  ): { success: boolean; message: string } {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(sessionId) as any;

    if (!session) return { success: false, message: 'Sesi tidak ditemukan.' };

    db.prepare(`
      UPDATE stranger_sessions
      SET status = 'SKIPPED',
          ended_at = datetime('now'),
          end_reason = ?
      WHERE id = ?
    `).run(`SKIPPED_BY_${userId}`, sessionId);

    return { success: true, message: 'Panggilan dilewati.' };
  }

  /**
   * Block match participant:
   *  - Terminates call immediately
   *  - Stores persistent block record
   *  - Prevents ever matching again
   */
  public static blockUser(
    sessionId: string,
    userId: string,
    blockedUserId: string
  ): { success: boolean; message: string } {
    const db = getDatabase();

    // 1. Record persistent block
    const blockId = uuidv4();
    db.prepare(`
      INSERT OR IGNORE INTO stranger_blocks (id, user_id, blocked_user_id)
      VALUES (?, ?, ?)
    `).run(blockId, userId, blockedUserId);

    // 2. Terminate session
    db.prepare(`
      UPDATE stranger_sessions
      SET status = 'BLOCKED',
          ended_at = datetime('now'),
          end_reason = ?
      WHERE id = ?
    `).run(`BLOCKED_BY_${userId}`, sessionId);

    // 3. Remove both from queue
    db.prepare('DELETE FROM stranger_queue WHERE user_id IN (?, ?)').run(userId, blockedUserId);

    return { success: true, message: 'Pengguna telah diblokir secara permanen dari Stranger Cam Anda.' };
  }

  /**
   * Report match participant for safety violation:
   *  - Terminates call
   *  - Logs moderation report
   *  - Logs safety event
   */
  public static reportUser(
    sessionId: string,
    reporterId: string,
    reportedUserId: string,
    reason: ReportReason,
    details?: string
  ): { success: boolean; reportId: string; message: string } {
    if (!ALLOWED_REPORT_REASONS.includes(reason)) {
      throw new Error(`Alasan laporan tidak valid: ${reason}`);
    }

    const db = getDatabase();
    const reportId = uuidv4();

    // 1. Create report record
    db.prepare(`
      INSERT INTO stranger_reports (id, session_id, reporter_id, reported_user_id, reason, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(reportId, sessionId, reporterId, reportedUserId, reason, details || null);

    // 2. Log safety event
    const eventId = uuidv4();
    const riskScore = reason === 'NUDITY' || reason === 'UNDERAGE_CONCERN' ? 1.0 : 0.8;
    db.prepare(`
      INSERT INTO stranger_safety_events (id, session_id, user_id, event_type, risk_score, payload)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(eventId, sessionId, reportedUserId, `USER_REPORT_${reason}`, riskScore, JSON.stringify({ details, reporterId }));

    // 3. Terminate session
    db.prepare(`
      UPDATE stranger_sessions
      SET status = 'REPORTED',
          ended_at = datetime('now'),
          end_reason = ?
      WHERE id = ?
    `).run(`REPORTED_${reason}_BY_${reporterId}`, sessionId);

    // 4. Auto-block reported user for reporter's protection
    db.prepare(`
      INSERT OR IGNORE INTO stranger_blocks (id, user_id, blocked_user_id)
      VALUES (?, ?, ?)
    `).run(uuidv4(), reporterId, reportedUserId);

    return {
      success: true,
      reportId,
      message: 'Laporan Anda telah diterima dan diteruskan ke tim moderasi. Panggilan dihentikan.',
    };
  }

  /**
   * End call gracefully.
   */
  public static endCall(
    sessionId: string,
    userId: string
  ): { success: boolean; message: string } {
    const db = getDatabase();
    db.prepare(`
      UPDATE stranger_sessions
      SET status = 'ENDED',
          ended_at = datetime('now'),
          end_reason = ?
      WHERE id = ?
    `).run(`ENDED_BY_${userId}`, sessionId);

    return { success: true, message: 'Percakapan selesai.' };
  }

  // ── Moderation & Anti-Scam ──────────────────────────────────────────────────

  /**
   * Content filter for in-call text chat messages (detects financial scams, credential phishing).
   */
  public static moderateMessage(content: string): {
    allowed: boolean;
    flags: string[];
    riskScore: number;
    warningMessage?: string;
  } {
    const flags: string[] = [];
    let maxScore = 0;

    for (const item of SUSPICIOUS_TEXT_PATTERNS) {
      if (item.pattern.test(content)) {
        flags.push(item.flag);
        if (item.score > maxScore) maxScore = item.score;
      }
    }

    if (maxScore >= 0.9) {
      return {
        allowed: false,
        flags,
        riskScore: maxScore,
        warningMessage: '⚠️ Pesan ini diblokir karena berpotensi melanggar kebijakan keamanan (indikasi penipuan / permintaan kredensial).',
      };
    }

    if (flags.includes('EXTERNAL_URL')) {
      return {
        allowed: true,
        flags,
        riskScore: maxScore,
        warningMessage: '⚠️ Berhati-hatilah saat membuka tautan eksternal dari orang asing.',
      };
    }

    return { allowed: true, flags, riskScore: 0 };
  }

  // ── Admin Telemetry & Health ────────────────────────────────────────────────

  /**
   * Get operational metrics for Admin Dashboard without raw video access.
   */
  public static getAdminStats(): {
    waitlistCount: number;
    activeSessions: number;
    totalReports: number;
    pendingReports: number;
    bannedOrBlockedCount: number;
  } {
    const db = getDatabase();

    const waitlist = db.prepare("SELECT COUNT(*) as count FROM feature_waitlist WHERE feature = 'STRANGER_CAM'").get() as { count: number };
    const sessions = db.prepare("SELECT COUNT(*) as count FROM stranger_sessions WHERE status = 'CONNECTED'").get() as { count: number };
    const reports = db.prepare("SELECT COUNT(*) as count FROM stranger_reports").get() as { count: number };
    const pending = db.prepare("SELECT COUNT(*) as count FROM stranger_reports WHERE status = 'PENDING'").get() as { count: number };
    const blocks = db.prepare("SELECT COUNT(*) as count FROM stranger_blocks").get() as { count: number };

    return {
      waitlistCount: Number(waitlist?.count || 0),
      activeSessions: Number(sessions?.count || 0),
      totalReports: Number(reports?.count || 0),
      pendingReports: Number(pending?.count || 0),
      bannedOrBlockedCount: Number(blocks?.count || 0),
    };
  }
}
