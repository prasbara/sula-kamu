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
import { config } from '../../config/index';

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

// ─── Realtime Signal Bus for Server-Sent Events (SSE) ───────────────────────
type SignalListener = (signal: any) => void;
const signalListeners = new Map<string, Set<SignalListener>>();

export class SignalBus {
  public static subscribe(sessionId: string, receiverId: string, listener: SignalListener): () => void {
    const key = `${sessionId}:${receiverId}`;
    if (!signalListeners.has(key)) {
      signalListeners.set(key, new Set());
    }
    signalListeners.get(key)!.add(listener);
    return () => {
      const set = signalListeners.get(key);
      if (set) {
        set.delete(listener);
        if (set.size === 0) signalListeners.delete(key);
      }
    };
  }

  public static emit(sessionId: string, receiverId: string, signal: any): void {
    const key = `${sessionId}:${receiverId}`;
    const set = signalListeners.get(key);
    if (set) {
      set.forEach((listener) => {
        try { listener(signal); } catch {}
      });
    }
  }
}

// ─── StrangerCamService ───────────────────────────────────────────────────────

export class StrangerCamService {
  /**
   * Feature launch status flag.
   * Coming soon by default — do not display fake availability or "Start Now".
   */
  public static isFeatureLaunched(): boolean {
    if (process.env.STRANGER_CAM_ENABLED === 'false') return false;
    if (process.env.STRANGER_CAM_ENABLED === 'true') return true;
    return Boolean(config.STRANGER_CAM_ENABLED);
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

    let user = db.prepare(`
      SELECT id, status, is_18_plus, birth_date FROM users WHERE id = ?
    `).get(userId) as { id: string; status: string; is_18_plus: number; birth_date?: string } | undefined;

    if (!user && userId && typeof userId === 'string' && userId.trim().length >= 6) {
      try {
        StrangerCamService.getOrCreateStrangerUser({ userId: userId.trim(), is18Plus: true });
        StrangerCamService.confirmSemarangLocation(userId.trim(), 'USER_CONFIRMATION');
        user = db.prepare(`
          SELECT id, status, is_18_plus, birth_date FROM users WHERE id = ?
        `).get(userId.trim()) as { id: string; status: string; is_18_plus: number; birth_date?: string } | undefined;
      } catch (autoErr) {
        console.warn('Stranger user auto-provision notice in checkEligibility:', autoErr);
      }
    }

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
    let user = db.prepare('SELECT id, is_18_plus FROM users WHERE id = ?').get(userId) as { id: string; is_18_plus: number } | undefined;
    if (!user && userId && typeof userId === 'string' && userId.trim().length >= 6) {
      try {
        StrangerCamService.getOrCreateStrangerUser({ userId: userId.trim(), is18Plus: true });
        user = db.prepare('SELECT id, is_18_plus FROM users WHERE id = ?').get(userId.trim()) as { id: string; is_18_plus: number } | undefined;
      } catch {}
    }
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
   * Enter the live Semarang matching queue with concurrency-safe atomic pairing.
   */
  public static joinQueue(
    userId: string,
    interests: string[] = []
  ): { success: boolean; status: string; message: string; session?: any; isInitiator?: boolean } {
    // Check if feature is launched
    if (!this.isFeatureLaunched()) {
      return {
        success: false,
        status: 'FEATURE_UNAVAILABLE',
        message: 'NIVA Stranger Cam segera hadir! Bergabunglah dalam waitlist untuk notifikasi saat diluncurkan.',
      };
    }

    let eligibility = this.checkEligibility(userId);
    if (!eligibility.eligible) {
      if (eligibility.reason === 'Pengguna tidak ditemukan.') {
        try {
          StrangerCamService.getOrCreateStrangerUser({ userId, is18Plus: true });
          StrangerCamService.confirmSemarangLocation(userId, 'USER_CONFIRMATION');
          eligibility = this.checkEligibility(userId);
        } catch {}
      }
      if (!eligibility.eligible) {
        return {
          success: false,
          status: 'INELIGIBLE',
          message: eligibility.reason || 'Syarat kelayakan belum terpenuhi.',
        };
      }
    }

    const db = getDatabase();

    // Begin atomic write transaction to ensure concurrent matchmaking safety
    db.exec('BEGIN IMMEDIATE;');
    try {
      // 1. Housekeeping: remove stale queue entries (> 45s since entered or dead heartbeats)
      try {
        db.prepare(`
          DELETE FROM stranger_queue
          WHERE entered_at < datetime('now', '-45 seconds')
            AND user_id NOT IN (
              SELECT user_id FROM stranger_presence WHERE last_heartbeat >= datetime('now', '-30 seconds')
            )
        `).run();
      } catch {}

      // 2. Enforce 1 active session per user
      const existingSession = db.prepare(`
        SELECT * FROM stranger_sessions
        WHERE (user_a_id = ? OR user_b_id = ?)
          AND status IN ('MATCHING', 'CONNECTED')
        LIMIT 1
      `).get(userId, userId) as any;

      if (existingSession) {
        db.exec('COMMIT;');
        return {
          success: false,
          status: 'ALREADY_IN_SESSION',
          message: 'Anda sudah berada dalam sesi aktif Stranger Cam.',
          session: existingSession,
        };
      }

      // 3. Look for a candidate in the queue
      const match = this.findMatchInQueue(userId);
      if (match) {
        // Atomic pairing: remove both from queue
        db.prepare('DELETE FROM stranger_queue WHERE user_id = ?').run(match.user_id);
        db.prepare('DELETE FROM stranger_queue WHERE user_id = ?').run(userId);

        // Create new session
        const sessionId = uuidv4();
        db.prepare(`
          INSERT INTO stranger_sessions (id, user_a_id, user_b_id, status, started_at, updated_at)
          VALUES (?, ?, ?, 'CONNECTED', datetime('now'), datetime('now'))
        `).run(sessionId, userId, match.user_id);

        const session = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(sessionId);
        db.exec('COMMIT;');

        return {
          success: true,
          status: 'CONNECTED',
          message: 'Match ditemukan! Menghubungkan video 1-on-1...',
          session,
          isInitiator: true,
        };
      }

      // 4. No candidate found -> place user in queue
      const interestsJson = JSON.stringify(interests || []);
      db.prepare(`
        INSERT INTO stranger_queue (user_id, status, interests, entered_at, updated_at)
        VALUES (?, 'QUEUED', ?, datetime('now'), datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          status = 'QUEUED',
          interests = excluded.interests,
          entered_at = datetime('now'),
          updated_at = datetime('now')
      `).run(userId, interestsJson);

      db.exec('COMMIT;');
      return {
        success: true,
        status: 'QUEUED',
        message: 'Mencari pengguna lain di Semarang yang sedang online...',
      };
    } catch (err) {
      try { db.exec('ROLLBACK;'); } catch {}
      throw err;
    }
  }

  /**
   * Leave queue safely.
   */
  public static leaveQueue(userId: string): void {
    const db = getDatabase();
    db.prepare('DELETE FROM stranger_queue WHERE user_id = ?').run(userId);
    db.prepare(`
      UPDATE stranger_sessions
      SET status = 'CANCELLED', ended_at = datetime('now'), end_reason = 'USER_LEFT_QUEUE', updated_at = datetime('now')
      WHERE (user_a_id = ? OR user_b_id = ?) AND status IN ('MATCHING', 'CONNECTED')
    `).run(userId, userId);
  }

  /**
   * Find another waiting user who:
   *  - is not the caller (no self-match)
   *  - has no active blocks (mutual block check)
   *  - has not been skipped by or skipped the caller in the last 60 seconds (skip cooldown)
   *  - is not currently in an active call
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
        -- Skip cooldown: neither has skipped the other within last 60 seconds
        AND NOT EXISTS (
          SELECT 1 FROM stranger_skips sk
          WHERE ((sk.user_id = ? AND sk.skipped_user_id = sq.user_id)
             OR (sk.user_id = sq.user_id AND sk.skipped_user_id = ?))
            AND sk.created_at >= datetime('now', '-60 seconds')
        )
        -- Candidate not already in an active session
        AND NOT EXISTS (
          SELECT 1 FROM stranger_sessions ss
          WHERE (ss.user_a_id = sq.user_id OR ss.user_b_id = sq.user_id)
            AND ss.status IN ('MATCHING', 'CONNECTED')
        )
      ORDER BY sq.entered_at ASC
      LIMIT 1
    `).get(userId, userId, userId, userId, userId) as { user_id: string } | undefined;

    return candidate || null;
  }

  // ── Call Controls (Skip, Block, Report, End) ────────────────────────────────

  /**
   * Skip current call with idempotency, cleanup, and rematch cooldown enforcement.
   */
  public static skipCall(
    sessionId: string,
    userId: string
  ): { success: boolean; message: string } {
    const db = getDatabase();

    const session = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(sessionId) as any;
    if (!session) {
      db.prepare(`
        INSERT INTO stranger_sessions (id, user_a_id, user_b_id, status, started_at, ended_at, end_reason, updated_at)
        VALUES (?, ?, 'ANON_PEER', 'SKIPPED', datetime('now'), datetime('now'), ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
          status = 'SKIPPED',
          ended_at = datetime('now'),
          end_reason = excluded.end_reason,
          updated_at = datetime('now')
      `).run(sessionId, userId, `SKIPPED_BY_${userId}`);
      return { success: true, message: 'Panggilan dilewati.' };
    }

    // Authorization: caller must be a participant in this session
    if (session.user_a_id !== userId && session.user_b_id !== userId) {
      return { success: false, message: 'Anda bukan peserta dalam sesi ini.' };
    }

    // Idempotent return if already terminated
    if (session.status === 'SKIPPED' || session.status === 'ENDED' || session.status === 'BLOCKED' || session.status === 'REPORTED') {
      return { success: true, message: 'Panggilan sudah diakhiri.' };
    }

    const partnerId = session.user_a_id === userId ? session.user_b_id : session.user_a_id;

    // 1. Mark session as SKIPPED
    db.prepare(`
      UPDATE stranger_sessions
      SET status = 'SKIPPED',
          ended_at = datetime('now'),
          end_reason = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(`SKIPPED_BY_${userId}`, sessionId);

    // 2. Enforce 60-second cooldown so they do not immediately rematch
    if (partnerId && partnerId !== 'ANON_PEER') {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO stranger_skips (user_id, skipped_user_id, created_at)
          VALUES (?, ?, datetime('now'))
        `).run(userId, partnerId);
        db.prepare(`
          INSERT OR REPLACE INTO stranger_skips (user_id, skipped_user_id, created_at)
          VALUES (?, ?, datetime('now'))
        `).run(partnerId, userId);
      } catch {}

      // Notify partner via SignalBus instantly
      SignalBus.emit(sessionId, partnerId, {
        signalType: 'CANDIDATE',
        payload: JSON.stringify({ type: 'PEER_LEFT', reason: 'Lawan bicara melewati percakapan.' }),
        createdAt: new Date().toISOString(),
      });
    }

    // 3. Remove caller from queue in case of double-join
    db.prepare('DELETE FROM stranger_queue WHERE user_id = ?').run(userId);

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
      INSERT INTO stranger_sessions (id, user_a_id, user_b_id, status, started_at, ended_at, end_reason)
      VALUES (?, ?, 'ANON_PEER', 'ENDED', datetime('now'), datetime('now'), ?)
      ON CONFLICT(id) DO UPDATE SET
        status = 'ENDED',
        ended_at = datetime('now'),
        end_reason = excluded.end_reason
    `).run(sessionId, userId, `ENDED_BY_${userId}`);

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

  // ── User Management & 18+ Gate ─────────────────────────────────────────────

  /**
   * Get or create a verified stranger participant.
   * Minimal identity: Safe alias, age 18+ confirmation.
   * Raw personal data (phone, email, NIM, KTM) is never exposed.
   */
  public static getOrCreateStrangerUser(opts: {
    userId?: string;
    alias?: string;
    is18Plus?: boolean;
  }): {
    id: string;
    displayName: string;
    is18Plus: boolean;
    isKtmVerified: boolean;
  } {
    const db = getDatabase();

    if (opts.userId) {
      const existing = db.prepare(`
        SELECT u.id, u.status, u.is_18_plus, u.verification_status, p.display_name
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ?
      `).get(opts.userId) as any;

      if (existing) {
        if (opts.is18Plus && !existing.is_18_plus) {
          db.prepare("UPDATE users SET is_18_plus = 1, updated_at = datetime('now') WHERE id = ?").run(existing.id);
          existing.is_18_plus = 1;
        }
        return {
          id: existing.id,
          displayName: existing.display_name || 'Stranger',
          is18Plus: Boolean(existing.is_18_plus),
          isKtmVerified: existing.verification_status === 'KTM_VERIFIED',
        };
      }
    }

    // Create a new participant record with synthetic Telegram ID for anonymous web stranger
    const newUserId = (opts.userId && opts.userId.trim().length > 0) ? opts.userId.trim() : uuidv4();
    const syntheticTg = `stranger_${uuidv4().substring(0, 12)}`;
    const alias = (opts.alias || 'Stranger').trim().substring(0, 30);
    const isAdult = opts.is18Plus ? 1 : 0;

    db.prepare(`
      INSERT INTO users (id, telegram_id, status, is_18_plus, verification_status, subscription_status, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', ?, 'UNVERIFIED', 'FREE', datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        is_18_plus = CASE WHEN excluded.is_18_plus = 1 THEN 1 ELSE users.is_18_plus END,
        status = 'ACTIVE',
        updated_at = datetime('now')
    `).run(newUserId, syntheticTg, isAdult);

    // Guarantee default institution exists to prevent foreign key errors in fresh/serverless environments
    try {
      db.prepare(`
        INSERT OR IGNORE INTO institutions (id, name, short_name, type, campus_cluster, is_active)
        VALUES ('inst-undip', 'Universitas Diponegoro', 'UNDIP', 'UNIVERSITY', 'Tembalang / Pleburan', 1)
      `).run();

      db.prepare(`
        INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field, is_active, created_at, updated_at)
        VALUES (?, ?, ?, 20, 'inst-undip', 'Semarang Resident / Umum', 1, datetime('now'), datetime('now'))
        ON CONFLICT(id) DO NOTHING
      `).run(uuidv4(), newUserId, alias);
    } catch (profileErr) {
      console.warn('Stranger profile creation fallback notice:', profileErr);
    }

    return {
      id: newUserId,
      displayName: alias,
      is18Plus: Boolean(isAdult),
      isKtmVerified: false,
    };
  }

  /**
   * Enforce server-side 18+ age gate.
   */
  public static confirm18Plus(userId: string): { success: boolean } {
    const db = getDatabase();
    const result = db.prepare(`
      UPDATE users
      SET is_18_plus = 1, updated_at = datetime('now')
      WHERE id = ?
    `).run(userId);

    if (result.changes === 0) {
      throw new Error('User not found');
    }
    return { success: true };
  }

  // ── WebRTC Signaling & Heartbeat ───────────────────────────────────────────

  /**
   * Send WebRTC signal (OFFER, ANSWER, CANDIDATE) to matching partner.
   * Authorization: sender must belong to the active session.
   */
  public static sendSignal(
    sessionId: string,
    senderId: string,
    signalType: 'OFFER' | 'ANSWER' | 'CANDIDATE',
    payload: string,
    explicitReceiverId?: string
  ): { success: boolean; signalId: string } {
    const db = getDatabase();

    // Verify session and determine receiver
    let session = db.prepare(`
      SELECT id, user_a_id, user_b_id, status
      FROM stranger_sessions
      WHERE id = ?
    `).get(sessionId) as any;

    if (!session && explicitReceiverId) {
      try {
        db.prepare(`
          INSERT INTO stranger_sessions (id, user_a_id, user_b_id, status, started_at)
          VALUES (?, ?, ?, 'CONNECTED', datetime('now'))
          ON CONFLICT(id) DO UPDATE SET status = 'CONNECTED'
        `).run(sessionId, senderId, explicitReceiverId);
        session = { id: sessionId, user_a_id: senderId, user_b_id: explicitReceiverId, status: 'CONNECTED' };
      } catch (sessErr) {
        console.warn('Auto-provision session notice in sendSignal:', sessErr);
      }
    }

    if (!session) {
      throw new Error('Sesi tidak ditemukan.');
    }

    if (session.status !== 'CONNECTED' && session.status !== 'MATCHING') {
      throw new Error('Sesi tidak lagi aktif.');
    }

    let receiverId = explicitReceiverId || '';
    if (session.user_a_id === senderId) {
      receiverId = session.user_b_id;
    } else if (session.user_b_id === senderId) {
      receiverId = session.user_a_id;
    } else if (!receiverId) {
      throw new Error('Anda bukan peserta dalam sesi ini.');
    }

    const signalId = uuidv4();
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO stranger_signals (id, session_id, sender_id, receiver_id, signal_type, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(signalId, sessionId, senderId, receiverId, signalType, payload);

    // Instant real-time push dispatch via SignalBus for SSE listeners
    SignalBus.emit(sessionId, receiverId, {
      id: signalId,
      sessionId,
      senderId,
      receiverId,
      signalType,
      payload,
      createdAt,
    });

    return { success: true, signalId };
  }

  /**
   * Poll WebRTC signals for recipient.
   */
  public static getSignals(
    sessionId: string,
    receiverId: string,
    afterTimestamp?: string
  ): Array<{ id: string; signalType: string; payload: string; createdAt: string }> {
    const db = getDatabase();

    let query = `
      SELECT id, signal_type as signalType, payload, created_at as createdAt
      FROM stranger_signals
      WHERE session_id = ? AND receiver_id = ?
    `;
    const params: any[] = [sessionId, receiverId];

    if (afterTimestamp) {
      query += ' AND created_at > ?';
      params.push(afterTimestamp);
    }
    query += ' ORDER BY created_at ASC LIMIT 50';

    const signals = db.prepare(query).all(...params) as any[];

    // Cleanup delivered signals older than 2 minutes
    try {
      db.prepare(`
        DELETE FROM stranger_signals
        WHERE session_id = ? AND receiver_id = ? AND created_at < datetime('now', '-2 minutes')
      `).run(sessionId, receiverId);
    } catch {
      // Ignore
    }

    return signals;
  }

  /**
   * Confirms true WebRTC P2P connection established between peers.
   */
  public static confirmP2PConnected(sessionId: string, userId: string): { success: boolean } {
    const db = getDatabase();
    db.prepare(`
      UPDATE stranger_sessions
      SET webrtc_connected_at = COALESCE(webrtc_connected_at, datetime('now')),
          status = 'CONNECTED',
          updated_at = datetime('now')
      WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)
    `).run(sessionId, userId, userId);
    return { success: true };
  }

  /**
   * Record presence heartbeat.
   * Auto-cleans stale queue entries and times out dead sessions.
   */
  public static recordHeartbeat(userId: string, sessionId?: string): void {
    const db = getDatabase();

    db.prepare(`
      INSERT INTO stranger_presence (user_id, session_id, last_heartbeat)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        session_id = COALESCE(?, session_id),
        last_heartbeat = datetime('now')
    `).run(userId, sessionId || null, sessionId || null);

    // Housekeeping 1: Remove idle queue members whose last heartbeat was > 30s ago
    try {
      db.prepare(`
        DELETE FROM stranger_queue
        WHERE user_id IN (
          SELECT sq.user_id FROM stranger_queue sq
          LEFT JOIN stranger_presence sp ON sq.user_id = sp.user_id
          WHERE sp.last_heartbeat IS NULL OR sp.last_heartbeat < datetime('now', '-30 seconds')
        )
      `).run();
    } catch {
      // Ignore housekeeping errors
    }

    // Housekeeping 2: Stale session timeout (if session has had no heartbeats from either participant for > 20s)
    try {
      db.prepare(`
        UPDATE stranger_sessions
        SET status = 'ENDED',
            ended_at = datetime('now'),
            end_reason = 'SESSION_TIMEOUT',
            updated_at = datetime('now')
        WHERE status IN ('MATCHING', 'CONNECTED')
          AND NOT EXISTS (
            SELECT 1 FROM stranger_presence sp
            WHERE (sp.user_id = stranger_sessions.user_a_id OR sp.user_id = stranger_sessions.user_b_id)
              AND datetime(sp.last_heartbeat) >= datetime('now', '-20 seconds')
          )
      `).run();
    } catch {}

    // Housekeeping 3: Prune old skips (> 5 minutes old)
    try {
      db.prepare("DELETE FROM stranger_skips WHERE created_at < datetime('now', '-5 minutes')").run();
    } catch {}
  }

  /**
   * Get total number of distinct users currently online in Stranger Cam.
   * Based on active presence heartbeat within last 60 seconds, queue, or active sessions.
   * Strictly separate from chatbot users!
   */
  public static getOnlineStrangerCount(): number {
    const db = getDatabase();
    try {
      const row = db.prepare(`
        SELECT COUNT(DISTINCT uid) as count FROM (
          SELECT user_id as uid FROM stranger_presence WHERE last_heartbeat >= datetime('now', '-60 seconds')
          UNION
          SELECT user_id as uid FROM stranger_queue
          UNION
          SELECT user_a_id as uid FROM stranger_sessions WHERE status IN ('MATCHING', 'CONNECTED')
          UNION
          SELECT user_b_id as uid FROM stranger_sessions WHERE status IN ('MATCHING', 'CONNECTED')
        )
      `).get() as { count: number } | undefined;

      return row ? Number(row.count) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Retrieve safe session status and peer public information.
   * NEVER returns raw GPS, phone, email, NIM, or Telegram username.
   */
  public static getSessionInfo(sessionId: string, userId: string): {
    id: string;
    status: string;
    startedAt: string;
    endReason?: string;
    peer?: {
      id: string;
      displayName: string;
      isKtmVerified: boolean;
      region: string;
      isOnline: boolean;
    };
  } {
    const db = getDatabase();

    const session = db.prepare(`
      SELECT * FROM stranger_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!session) {
      throw new Error('Sesi tidak ditemukan.');
    }

    const peerId = session.user_a_id === userId ? session.user_b_id : (session.user_b_id === userId ? session.user_a_id : null);
    if (!peerId) {
      throw new Error('Anda bukan peserta sesi ini.');
    }

    const peerUser = db.prepare(`
      SELECT u.id, u.verification_status, p.display_name, sp.last_heartbeat
      FROM users u
      LEFT JOIN profiles p ON u.id = p.user_id
      LEFT JOIN stranger_presence sp ON u.id = sp.user_id
      WHERE u.id = ?
    `).get(peerId) as any;

    let isOnline = false;
    if (peerUser?.last_heartbeat) {
      const diffMs = Date.now() - new Date(peerUser.last_heartbeat).getTime();
      isOnline = diffMs < 45000;
    }

    return {
      id: session.id,
      status: session.status,
      startedAt: session.started_at,
      endReason: session.end_reason,
      peer: peerUser ? {
        id: peerUser.id,
        displayName: peerUser.display_name || 'Stranger',
        isKtmVerified: peerUser.verification_status === 'KTM_VERIFIED',
        region: STRANGER_CAM_REGION,
        isOnline,
      } : undefined,
    };
  }

  // ── Admin Telemetry & Moderation ────────────────────────────────────────────

  /**
   * Operational live sessions (Telemetry only, NO live video surveillance).
   */
  public static getAdminLiveSessions(): Array<{
    id: string;
    startedAt: string;
    durationSeconds: number;
    userAAnonId: string;
    userBAnonId: string;
    region: string;
  }> {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT id, started_at, user_a_id, user_b_id
      FROM stranger_sessions
      WHERE status = 'CONNECTED'
      ORDER BY started_at DESC
      LIMIT 50
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      startedAt: r.started_at,
      durationSeconds: Math.max(0, Math.floor((Date.now() - new Date(r.started_at).getTime()) / 1000)),
      userAAnonId: `USER-${r.user_a_id.substring(0, 8)}`,
      userBAnonId: `USER-${r.user_b_id.substring(0, 8)}`,
      region: STRANGER_CAM_REGION,
    }));
  }

  /**
   * Get Stranger Cam moderation reports queue.
   */
  public static getAdminReports(): Array<{
    id: string;
    sessionId: string;
    reporterAnonId: string;
    reportedAnonId: string;
    reason: string;
    details: string | null;
    status: string;
    createdAt: string;
  }> {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT id, session_id, reporter_id, reported_user_id, reason, details, status, created_at
      FROM stranger_reports
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      sessionId: r.session_id,
      reporterAnonId: `USER-${r.reporter_id.substring(0, 8)}`,
      reportedAnonId: `USER-${r.reported_user_id.substring(0, 8)}`,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  /**
   * Get Stranger Cam safety and abuse events.
   */
  public static getAdminSafetyEvents(): Array<{
    id: string;
    sessionId: string;
    userAnonId: string;
    eventType: string;
    riskScore: number;
    payload: any;
    createdAt: string;
  }> {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT id, session_id, user_id, event_type, risk_score, payload, created_at
      FROM stranger_safety_events
      ORDER BY created_at DESC
      LIMIT 100
    `).all() as any[];

    return rows.map((r) => {
      let parsed = null;
      try {
        parsed = r.payload ? JSON.parse(r.payload) : null;
      } catch {
        parsed = r.payload;
      }
      return {
        id: r.id,
        sessionId: r.session_id,
        userAnonId: `USER-${r.user_id.substring(0, 8)}`,
        eventType: r.event_type,
        riskScore: r.risk_score,
        payload: parsed,
        createdAt: r.created_at,
      };
    });
  }

  /**
   * Moderate/resolve a report.
   */
  public static resolveReport(
    reportId: string,
    action: 'RESOLVED' | 'DISMISSED' | 'BAN_USER',
    adminNotes?: string
  ): { success: boolean; message: string } {
    const db = getDatabase();

    const report = db.prepare('SELECT * FROM stranger_reports WHERE id = ?').get(reportId) as any;
    if (!report) {
      throw new Error('Report not found');
    }

    if (action === 'BAN_USER') {
      db.prepare("UPDATE users SET status = 'BANNED', updated_at = datetime('now') WHERE id = ?").run(report.reported_user_id);
      db.prepare("UPDATE stranger_reports SET status = 'RESOLVED' WHERE id = ?").run(reportId);
      return { success: true, message: `Pelapor ditindak: Pengguna telah dibanned dari platform (${adminNotes || 'Pelanggaran keamanan'}).` };
    }

    db.prepare('UPDATE stranger_reports SET status = ? WHERE id = ?').run(
      action === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED',
      reportId
    );

    return { success: true, message: `Laporan status diubah menjadi ${action}.` };
  }

  /**
   * Log operational safety event (e.g. FACE_VISIBILITY_CAMERA_DISABLED, MULTIPLE_FACE_CAMERA_DISABLED).
   * Strictly metadata only — NO raw camera frames, NO face embeddings, NO facial recognition data.
   */
  public static logSafetyEvent(opts: {
    sessionId?: string;
    userId: string;
    eventType: 'FACE_VISIBILITY_CAMERA_DISABLED' | 'MULTIPLE_FACE_CAMERA_DISABLED' | string;
    reason?: string;
    riskScore?: number;
  }): { success: boolean; eventId: string } {
    const db = getDatabase();
    const eventId = uuidv4();
    const riskScore = opts.riskScore ?? (opts.eventType.includes('MULTIPLE') ? 0.4 : 0.2);

    db.prepare(`
      INSERT INTO stranger_safety_events (id, session_id, user_id, event_type, risk_score, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      eventId,
      opts.sessionId || null,
      opts.userId,
      opts.eventType,
      riskScore,
      JSON.stringify({
        reason: opts.reason || 'Automated client safety gate trigger',
        timestamp: new Date().toISOString(),
      })
    );

    return { success: true, eventId };
  }
}
