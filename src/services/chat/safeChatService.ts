/**
 * SafeChatService — NIVA Exclusive Active Match Session
 *
 * Business rules:
 *  1. The 10-minute budget is NOT wall-clock time.
 *     It is MUTUALLY-ACTIVE SECONDS accumulated via server-side heartbeats.
 *  2. The exclusive lock is NOT acquired at match creation.
 *     It is acquired when BOTH participants join the session.
 *  3. If one user becomes inactive (no heartbeat >15 s), the timer PAUSES.
 *     Locks remain held during the 2-minute inactivity grace period.
 *  4. After the grace period expires the session ends with ENDED_BY_INACTIVITY.
 *  5. Block / Report / End overrides immediately, releases locks.
 *  6. At 600 active seconds → SAFE_CHAT_COMPLETED → mutual private-chat decision.
 *  7. Every discovery API must check isUserLocked() server-side.
 *
 * All state is stored in the database — no in-memory-only state.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { ModerationService } from '../safety/moderationService';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Max mutual-active seconds before session completes */
const MAX_ACTIVE_SECONDS = 600; // 10 minutes

/** Heartbeat is considered valid if within the last N seconds */
const HEARTBEAT_VALID_WINDOW_S = 30;

/** Inactivity grace period before session auto-ends (seconds) */
const INACTIVITY_GRACE_PERIOD_S = 120; // 2 minutes

function parseSqliteUtc(dateStr: string | null | undefined): number {
  if (!dateStr) return Date.now();
  const iso = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  return new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionStatus =
  | 'SAFE_CHAT_WAITING'
  | 'SAFE_CHAT_ACTIVE'
  | 'SAFE_CHAT_PAUSED'
  | 'SAFE_CHAT_COMPLETED'
  | 'PRIVATE_CHAT_PENDING'
  | 'PRIVATE_CHAT_ENABLED'
  | 'ENDED_BY_USER'
  | 'ENDED_BY_INACTIVITY'
  | 'BLOCKED'
  | 'REPORTED';

/** Terminal statuses — no further transitions allowed */
const TERMINAL_STATUSES: SessionStatus[] = [
  'SAFE_CHAT_COMPLETED',
  'PRIVATE_CHAT_ENABLED',
  'ENDED_BY_USER',
  'ENDED_BY_INACTIVITY',
  'BLOCKED',
  'REPORTED',
];

export interface SafeChatSession {
  id: string;
  match_id: string;
  user_a_id: string;
  user_b_id: string;
  status: SessionStatus;
  user_a_joined_at: string | null;
  user_b_joined_at: string | null;
  active_seconds: number;
  last_tick_at: string | null;
  last_both_active_at: string | null;
  paused_at: string | null;
  ended_at: string | null;
  end_reason: string | null;
  message_count: number;
  flagged_message_count: number;
  last_moderation_action: string | null;
  user_a_private_decision: 'YES' | 'NO' | null;
  user_b_private_decision: 'YES' | 'NO' | null;
  created_at: string;
  updated_at: string;
}

export interface SessionStatusResponse {
  sessionId: string;
  matchId: string;
  status: SessionStatus;
  activeSeconds: number;
  remainingSeconds: number;
  userAActive: boolean;
  userBActive: boolean;
  bothActive: boolean;
  /** Seconds since one user went inactive (null if both active) */
  inactiveSince: number | null;
  /** Seconds remaining in grace period (null if not paused) */
  gracePeriodRemainingSeconds: number | null;
  isTerminal: boolean;
  privateDecision: { userA: 'YES' | 'NO' | null; userB: 'YES' | 'NO' | null };
}

export interface ModerationResult {
  allowed: boolean;
  action: 'ALLOWED' | 'WARNED' | 'BLOCKED' | 'ESCALATED';
  flags: string[];
  score: number;
  userMessage?: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  moderation: ModerationResult;
  sessionStatus: SessionStatus;
  activeSeconds: number;
  remainingSeconds: number;
}

// ─── Anti-Abuse Pattern Database ─────────────────────────────────────────────

const PHONE_PATTERNS = [
  /\b0\d{8,12}\b/,
  /\b(\+62|62)\s?\d{8,12}\b/,
  /\b08[1-9][0-9]{7,10}\b/,
  /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/,
];

const CONTACT_LEAK_PATTERNS = [
  /\bt\.me\/[a-zA-Z0-9_]{3,}/i,
  /@[a-zA-Z0-9_]{3,}\b/,
  /wa\.me\/\d+/i,
  /whatsapp[:\s]*(\+?\d{8,})/i,
  /\bline[:\s]*id\b/i,
  /\binstagram[:\s]*[a-z0-9_.]{3,}/i,
];

const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/i,
  /bit\.ly\/[a-zA-Z0-9]+/i,
  /tinyurl\.com\/[a-zA-Z0-9]+/i,
  /\b[a-zA-Z0-9-]+\.(com|net|org|id|io|co|xyz|info|biz)\b/i,
];

const SCAM_PATTERNS = [
  /transfer\s+(uang|dana|duit)/i,
  /kirim\s+(uang|dana|duit)/i,
  /butuh\s+(uang|bantuan\s+keuangan)/i,
  /pinjam(kan)?\s+uang/i,
  /balik\s+modal/i,
  /investasi\s+(menguntungkan|cuan|profit)/i,
  /klik\s+link/i,
  /daftar\s+sekarang/i,
  /no\s+rek(ening)?/i,
  /nomor\s+rekening/i,
];

const EXPLICIT_PATTERNS = [
  /\b(nude|naked|bugil|telanjang|bokep|porno|ngentot|sex(y)?|colmek|masturbasi)\b/i,
  /\b(xxx|18\+|dewasa|konten\s+panas|foto\s+panas|kirimin\s+foto)\b/i,
];

const DOXXING_PATTERNS = [
  /\b(alamat\s+rumah|nomor\s+nim|tanggal\s+lahir)\b/i,
  /\bktp\s+(nomor|no\.?)\b/i,
];

const PATTERN_SCORES: { patterns: RegExp[]; score: number; flag: string }[] = [
  { patterns: PHONE_PATTERNS,        score: 0.85, flag: 'PHONE_NUMBER'     },
  { patterns: CONTACT_LEAK_PATTERNS, score: 0.80, flag: 'EXTERNAL_CONTACT' },
  { patterns: LINK_PATTERNS,         score: 0.75, flag: 'EXTERNAL_LINK'    },
  { patterns: SCAM_PATTERNS,         score: 0.90, flag: 'SCAM_PATTERN'     },
  { patterns: EXPLICIT_PATTERNS,     score: 1.00, flag: 'EXPLICIT_CONTENT' },
  { patterns: DOXXING_PATTERNS,      score: 0.85, flag: 'DOXXING'          },
];

// ─── SafeChatService ──────────────────────────────────────────────────────────

export class SafeChatService {
  // ── Session Lifecycle ───────────────────────────────────────────────────────

  /**
   * Get or create a SafeChatSession for a match.
   * Created with SAFE_CHAT_WAITING — no lock, no timer.
   * Requires user_a_id and user_b_id from the match record.
   */
  public static getOrCreateSession(matchId: string): SafeChatSession {
    const db = getDatabase();
    const existing = db.prepare(
      'SELECT * FROM safe_chat_sessions WHERE match_id = ?'
    ).get(matchId) as unknown as SafeChatSession | undefined;

    if (existing) return existing;

    // Fetch user_a_id and user_b_id from match
    const match = db.prepare('SELECT user_a_id, user_b_id FROM matches WHERE id = ?').get(matchId) as
      | { user_a_id: string; user_b_id: string }
      | undefined;

    if (!match) throw new Error(`Match ${matchId} not found`);

    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO safe_chat_sessions
        (id, match_id, user_a_id, user_b_id, status, active_seconds)
      VALUES (?, ?, ?, ?, 'SAFE_CHAT_WAITING', 0)
    `).run(sessionId, matchId, match.user_a_id, match.user_b_id);

    return db.prepare('SELECT * FROM safe_chat_sessions WHERE id = ?').get(sessionId) as unknown as SafeChatSession;
  }

  /**
   * Mark a user as having joined the session (entered the chat UI).
   * When BOTH users have joined, transitions to SAFE_CHAT_ACTIVE and acquires exclusive lock.
   *
   * Returns the updated session.
   */
  public static joinSession(matchId: string, userId: string): {
    session: SafeChatSession;
    lockAcquired: boolean;
    alreadyLocked: boolean;
  } {
    const db = getDatabase();
    const session = this.getOrCreateSession(matchId);

    // Ignore if already in an active/terminal state
    if (TERMINAL_STATUSES.includes(session.status)) {
      return { session, lockAcquired: false, alreadyLocked: false };
    }

    // Determine which user slot to fill
    const isUserA = session.user_a_id === userId;
    const isUserB = session.user_b_id === userId;

    if (!isUserA && !isUserB) {
      throw new Error(`User ${userId} is not part of match ${matchId}`);
    }

    const joinedField = isUserA ? 'user_a_joined_at' : 'user_b_joined_at';

    // Mark joined if not already
    if (isUserA && !session.user_a_joined_at) {
      db.prepare(`
        UPDATE safe_chat_sessions
        SET ${joinedField} = datetime('now'), updated_at = datetime('now')
        WHERE match_id = ?
      `).run(matchId);
    } else if (isUserB && !session.user_b_joined_at) {
      db.prepare(`
        UPDATE safe_chat_sessions
        SET ${joinedField} = datetime('now'), updated_at = datetime('now')
        WHERE match_id = ?
      `).run(matchId);
    }

    // Refresh session
    const updated = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession;

    // Check if both have now joined and status is still WAITING
    const bothJoined = !!(updated.user_a_joined_at && updated.user_b_joined_at);
    if (bothJoined && updated.status === 'SAFE_CHAT_WAITING') {
      // Check if either user is already locked to a different session
      const lockA = db.prepare(
        "SELECT session_id FROM user_exclusive_locks WHERE user_id = ? AND released_at IS NULL"
      ).get(updated.user_a_id) as { session_id: string } | undefined;
      const lockB = db.prepare(
        "SELECT session_id FROM user_exclusive_locks WHERE user_id = ? AND released_at IS NULL"
      ).get(updated.user_b_id) as { session_id: string } | undefined;

      if ((lockA && lockA.session_id !== updated.id) || (lockB && lockB.session_id !== updated.id)) {
        // One of the users is locked to another session — cannot start
        return { session: updated, lockAcquired: false, alreadyLocked: true };
      }

      // Atomically transition to ACTIVE and acquire locks
      db.prepare(`
        UPDATE safe_chat_sessions
        SET status = 'SAFE_CHAT_ACTIVE',
            last_tick_at = datetime('now'),
            updated_at = datetime('now')
        WHERE match_id = ? AND status = 'SAFE_CHAT_WAITING'
      `).run(matchId);

      this.acquireExclusiveLock(updated.id, updated.user_a_id, updated.user_b_id);

      // Record initial heartbeats for both users
      this.recordHeartbeat(updated.user_a_id, updated.id);
      this.recordHeartbeat(updated.user_b_id, updated.id);

      const active = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession;
      return { session: active, lockAcquired: true, alreadyLocked: false };
    }

    return { session: updated, lockAcquired: false, alreadyLocked: false };
  }

  /**
   * Tick the active-seconds accumulator. Called by the heartbeat endpoint.
   *
   * Logic:
   *  - Record caller's heartbeat
   *  - Check mutual presence (both heartbeated within HEARTBEAT_VALID_WINDOW_S)
   *  - If mutually active: add elapsed seconds since last_tick_at
   *  - If one inactive: transition to SAFE_CHAT_PAUSED (timer frozen, locks held)
   *  - If paused and grace period exceeded: end session with ENDED_BY_INACTIVITY
   *  - If active_seconds >= 600: transition to SAFE_CHAT_COMPLETED
   *
   * Returns the full session status response.
   */
  public static tickActiveSeconds(matchId: string, callerUserId: string): SessionStatusResponse {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession | undefined;

    if (!session) throw new Error(`Session for match ${matchId} not found`);

    // Record heartbeat for the calling user
    this.recordHeartbeat(callerUserId, session.id);

    // If not in a ticking state, just return current status
    if (!['SAFE_CHAT_ACTIVE', 'SAFE_CHAT_PAUSED'].includes(session.status)) {
      return this.buildStatusResponse(session);
    }

    const now = Date.now();
    const lastTickMs = session.last_tick_at ? parseSqliteUtc(session.last_tick_at) : now;
    const elapsedSeconds = Math.round((now - lastTickMs) / 1000);

    // Check mutual presence
    const userAActive = this.isUserActiveInWindow(session.user_a_id, HEARTBEAT_VALID_WINDOW_S);
    const userBActive = this.isUserActiveInWindow(session.user_b_id, HEARTBEAT_VALID_WINDOW_S);
    const bothActive = userAActive && userBActive;

    if (bothActive) {
      // Resume if paused
      const newActiveSeconds = Math.min(session.active_seconds + Math.max(0, elapsedSeconds), MAX_ACTIVE_SECONDS);
      const newStatus: SessionStatus = newActiveSeconds >= MAX_ACTIVE_SECONDS
        ? 'SAFE_CHAT_COMPLETED'
        : 'SAFE_CHAT_ACTIVE';

      db.prepare(`
        UPDATE safe_chat_sessions
        SET status = ?,
            active_seconds = ?,
            last_tick_at = datetime('now'),
            last_both_active_at = datetime('now'),
            paused_at = NULL,
            updated_at = datetime('now')
        WHERE match_id = ?
      `).run(newStatus, newActiveSeconds, matchId);

      if (newStatus === 'SAFE_CHAT_COMPLETED') {
        // Release locks — session is done, awaiting private decision
        this.releaseSessionLocks(session.id);
      }
    } else {
      // At least one user is inactive
      if (session.status === 'SAFE_CHAT_ACTIVE') {
        // Transition to PAUSED
        db.prepare(`
          UPDATE safe_chat_sessions
          SET status = 'SAFE_CHAT_PAUSED',
              paused_at = datetime('now'),
              last_tick_at = datetime('now'),
              updated_at = datetime('now')
          WHERE match_id = ?
        `).run(matchId);
      } else if (session.status === 'SAFE_CHAT_PAUSED' && session.paused_at) {
        // Check grace period
        const pausedMs = parseSqliteUtc(session.paused_at);
        const secondsPaused = Math.round((now - pausedMs) / 1000);

        if (secondsPaused >= INACTIVITY_GRACE_PERIOD_S) {
          // End session due to inactivity
          db.prepare(`
            UPDATE safe_chat_sessions
            SET status = 'ENDED_BY_INACTIVITY',
                ended_at = datetime('now'),
                end_reason = 'INACTIVITY_GRACE_PERIOD_EXCEEDED',
                updated_at = datetime('now')
            WHERE match_id = ?
          `).run(matchId);
          this.releaseSessionLocks(session.id);
        }
        // else: still in grace period — no timer change, just update last_tick_at
        db.prepare(`
          UPDATE safe_chat_sessions SET last_tick_at = datetime('now'), updated_at = datetime('now')
          WHERE match_id = ?
        `).run(matchId);
      }
    }

    const refreshed = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession;
    return this.buildStatusResponse(refreshed);
  }

  /**
   * Get full session status without ticking. Safe for read-only polling.
   */
  public static getSessionStatus(matchId: string): SessionStatusResponse {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession | undefined;

    if (!session) {
      // Return default empty state
      return {
        sessionId: '',
        matchId,
        status: 'SAFE_CHAT_WAITING',
        activeSeconds: 0,
        remainingSeconds: MAX_ACTIVE_SECONDS,
        userAActive: false,
        userBActive: false,
        bothActive: false,
        inactiveSince: null,
        gracePeriodRemainingSeconds: null,
        isTerminal: false,
        privateDecision: { userA: null, userB: null },
      };
    }

    return this.buildStatusResponse(session);
  }

  /**
   * End the session immediately (user-initiated: End Chat, Block, Report).
   * Releases exclusive locks for both participants.
   */
  public static endSession(
    matchId: string,
    initiatorId: string,
    reason: 'USER_ENDED' | 'BLOCKED' | 'REPORTED'
  ): { success: boolean; message: string } {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession | undefined;

    if (!session) return { success: false, message: 'Sesi tidak ditemukan.' };

    const statusMap: Record<string, SessionStatus> = {
      USER_ENDED: 'ENDED_BY_USER',
      BLOCKED:    'BLOCKED',
      REPORTED:   'REPORTED',
    };

    const newStatus = statusMap[reason] ?? 'ENDED_BY_USER';

    db.prepare(`
      UPDATE safe_chat_sessions
      SET status = ?,
          ended_at = datetime('now'),
          end_reason = ?,
          updated_at = datetime('now')
      WHERE match_id = ?
    `).run(newStatus, `${reason}_BY_${initiatorId}`, matchId);

    // Always release locks — safety override
    this.releaseSessionLocks(session.id);

    const messages: Record<string, string> = {
      USER_ENDED: 'Sesi percakapan telah diakhiri.',
      BLOCKED:    'Pengguna telah diblokir dan sesi dihentikan.',
      REPORTED:   'Laporan dikirimkan dan sesi dihentikan.',
    };

    return { success: true, message: messages[reason] ?? 'Sesi dihentikan.' };
  }

  /**
   * Record a user's private-chat decision after SAFE_CHAT_COMPLETED.
   * Returns new session status.
   */
  public static recordPrivateDecision(
    matchId: string,
    userId: string,
    decision: 'YES' | 'NO'
  ): { status: SessionStatus; message: string } {
    const db = getDatabase();
    const session = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession | undefined;

    if (!session) return { status: 'ENDED_BY_USER', message: 'Sesi tidak ditemukan.' };
    if (session.status !== 'SAFE_CHAT_COMPLETED' && session.status !== 'PRIVATE_CHAT_PENDING') {
      return { status: session.status, message: 'Sesi belum selesai atau sudah diputuskan.' };
    }

    const isUserA = session.user_a_id === userId;
    const isUserB = session.user_b_id === userId;

    if (!isUserA && !isUserB) {
      return { status: session.status, message: 'Anda bukan peserta sesi ini.' };
    }

    const decisionField = isUserA ? 'user_a_private_decision' : 'user_b_private_decision';
    db.prepare(`
      UPDATE safe_chat_sessions SET ${decisionField} = ?, updated_at = datetime('now')
      WHERE match_id = ?
    `).run(decision, matchId);

    const updated = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession;
    const aDecision = isUserA ? decision : updated.user_a_private_decision;
    const bDecision = isUserB ? decision : updated.user_b_private_decision;

    if (aDecision === 'YES' && bDecision === 'YES') {
      db.prepare(`
        UPDATE safe_chat_sessions
        SET status = 'PRIVATE_CHAT_ENABLED', updated_at = datetime('now')
        WHERE match_id = ?
      `).run(matchId);
      return { status: 'PRIVATE_CHAT_ENABLED', message: '✅ Keduanya setuju! Kalian bisa melanjutkan di Telegram secara pribadi.' };
    }

    if (aDecision === 'NO' || bDecision === 'NO') {
      // At least one said NO — remain completed, don't enable private chat
      db.prepare(`
        UPDATE safe_chat_sessions
        SET status = 'ENDED_BY_USER', ended_at = datetime('now'), end_reason = 'PRIVATE_DECISION_DECLINED', updated_at = datetime('now')
        WHERE match_id = ?
      `).run(matchId);
      return { status: 'ENDED_BY_USER', message: 'Salah satu peserta memilih untuk tidak melanjutkan secara pribadi. Percakapan selesai.' };
    }

    // One has decided, other hasn't
    db.prepare(`
      UPDATE safe_chat_sessions SET status = 'PRIVATE_CHAT_PENDING', updated_at = datetime('now')
      WHERE match_id = ?
    `).run(matchId);
    return { status: 'PRIVATE_CHAT_PENDING', message: '⏳ Menunggu keputusan dari match Anda...' };
  }

  // ── Presence & Heartbeat ────────────────────────────────────────────────────

  /**
   * Record server-side presence heartbeat for a user.
   * Also stores which session the heartbeat belongs to for validation.
   */
  public static recordHeartbeat(userId: string, sessionId?: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO user_presence (user_id, session_id, last_heartbeat_at, presence_status, updated_at)
      VALUES (?, ?, datetime('now'), 'ACTIVE', datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        session_id = COALESCE(?, session_id),
        last_heartbeat_at = datetime('now'),
        presence_status = 'ACTIVE',
        updated_at = datetime('now')
    `).run(userId, sessionId ?? null, sessionId ?? null);
  }

  /**
   * Check if a user has a valid heartbeat within the given window (seconds).
   */
  public static isUserActiveInWindow(userId: string, windowSeconds: number): boolean {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT 1 FROM user_presence
      WHERE user_id = ?
        AND datetime(last_heartbeat_at) >= datetime('now', ? || ' seconds')
    `).get(userId, `-${windowSeconds}`) as { 1: number } | undefined;
    return !!row;
  }

  // ── Discovery Lock ──────────────────────────────────────────────────────────

  /**
   * Acquire exclusive lock for both participants.
   * Uses ON CONFLICT to handle re-acquisition atomically.
   */
  public static acquireExclusiveLock(sessionId: string, userAId: string, userBId: string): void {
    const db = getDatabase();
    for (const uid of [userAId, userBId]) {
      db.prepare(`
        INSERT INTO user_exclusive_locks (user_id, session_id, locked_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          session_id = ?,
          locked_at = datetime('now'),
          released_at = NULL
      `).run(uid, sessionId, sessionId);
    }
  }

  /**
   * Release all locks for a given session.
   */
  public static releaseSessionLocks(sessionId: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE user_exclusive_locks
      SET released_at = datetime('now')
      WHERE session_id = ? AND released_at IS NULL
    `).run(sessionId);
  }

  /**
   * Release lock for a single user (e.g. on unmatch/block).
   */
  public static releaseExclusiveLock(userId: string): void {
    const db = getDatabase();
    const lock = db.prepare(
      'SELECT session_id FROM user_exclusive_locks WHERE user_id = ? AND released_at IS NULL'
    ).get(userId) as { session_id: string } | undefined;
    if (lock) {
      this.releaseSessionLocks(lock.session_id);
    }
  }

  /**
   * Check if a user currently holds an active exclusive session lock.
   * Returns locked status, session ID, and partner display name.
   */
  public static isUserLocked(userId: string): {
    locked: boolean;
    sessionId?: string;
    matchId?: string;
    partnerName?: string;
  } {
    const db = getDatabase();
    const lock = db.prepare(`
      SELECT uel.session_id, scs.match_id, scs.status
      FROM user_exclusive_locks uel
      JOIN safe_chat_sessions scs ON scs.id = uel.session_id
      WHERE uel.user_id = ?
        AND uel.released_at IS NULL
        AND scs.status IN ('SAFE_CHAT_ACTIVE', 'SAFE_CHAT_PAUSED', 'SAFE_CHAT_WAITING')
    `).get(userId) as { session_id: string; match_id: string; status: string } | undefined;

    if (!lock) return { locked: false };

    const session = db.prepare('SELECT user_a_id, user_b_id FROM safe_chat_sessions WHERE id = ?').get(lock.session_id) as
      | { user_a_id: string; user_b_id: string }
      | undefined;

    const partnerId = session?.user_a_id === userId ? session?.user_b_id : session?.user_a_id;
    const partner = partnerId
      ? (db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(partnerId) as { display_name?: string } | undefined)
      : undefined;

    return {
      locked: true,
      sessionId: lock.session_id,
      matchId: lock.match_id,
      partnerName: partner?.display_name || 'Match Anda',
    };
  }

  // ── Message Moderation ──────────────────────────────────────────────────────

  /**
   * Analyse a message for safety violations.
   */
  public static moderateMessage(content: string): ModerationResult {
    const flags: string[] = [];
    let score = 0.0;

    for (const { patterns, score: s, flag } of PATTERN_SCORES) {
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          if (!flags.includes(flag)) {
            flags.push(flag);
            score = Math.max(score, s);
          }
          break;
        }
      }
    }

    let action: ModerationResult['action'] = 'ALLOWED';
    let userMessage: string | undefined;

    if (score >= 1.0) {
      action = 'BLOCKED';
      userMessage = '🚫 Pesan Anda diblokir karena mengandung konten eksplisit yang melanggar Community Guidelines NIVA. Pelanggaran berulang akan mengakibatkan penangguhan akun.';
    } else if (score >= 0.80) {
      action = 'BLOCKED';
      if (flags.includes('PHONE_NUMBER') || flags.includes('EXTERNAL_CONTACT')) {
        userMessage = '⚠️ Pesan diblokir. Berbagi nomor telepon atau kontak media sosial dilarang selama sesi aman. Gunakan fitur "Lanjut Privat" setelah 10 menit aktif.';
      } else if (flags.includes('SCAM_PATTERN')) {
        userMessage = '🚨 Pesan diblokir. Terdeteksi pola penipuan keuangan. Jika ini kesalahan, hubungi dukungan NIVA.';
      } else {
        userMessage = '⚠️ Pesan diblokir karena melanggar Community Guidelines NIVA.';
      }
    } else if (score >= 0.70) {
      action = 'WARNED';
      userMessage = flags.includes('EXTERNAL_LINK')
        ? '⚠️ Pesan Anda mengandung tautan eksternal dan telah ditandai. Hindari berbagi link di NIVA.'
        : '⚠️ Pesan Anda telah ditandai oleh sistem moderasi. Perhatikan Community Guidelines NIVA.';
    }

    return { allowed: action !== 'BLOCKED', action, flags, score, userMessage };
  }

  /**
   * Send a moderated message inside the safe chat session.
   */
  public static sendSandboxMessage(
    matchId: string,
    senderUserId: string,
    recipientUserId: string,
    content: string
  ): SendMessageResult {
    const db = getDatabase();
    const session = this.getOrCreateSession(matchId);
    const moderation = this.moderateMessage(content);

    const activeSeconds = session.active_seconds ?? 0;
    const remainingSeconds = Math.max(0, MAX_ACTIVE_SECONDS - activeSeconds);

    if (!moderation.allowed) {
      const blockedMsgId = uuidv4();
      db.prepare(`
        INSERT INTO moderated_messages (id, match_id, message_id, sender_id, content_snapshot, flags, action_taken, moderation_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), matchId, blockedMsgId, senderUserId, content.slice(0, 500), JSON.stringify(moderation.flags), moderation.action, moderation.score);

      db.prepare(`
        UPDATE safe_chat_sessions
        SET flagged_message_count = flagged_message_count + 1,
            last_moderation_action = ?,
            updated_at = datetime('now')
        WHERE match_id = ?
      `).run(moderation.action, matchId);

      const updatedSession = db.prepare('SELECT flagged_message_count FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as { flagged_message_count: number } | undefined;
      if ((updatedSession?.flagged_message_count ?? 0) >= 3) {
        db.prepare(`
          UPDATE safe_chat_sessions
          SET status = 'REPORTED', ended_at = datetime('now'), end_reason = 'AUTO_MODERATION_THRESHOLD', updated_at = datetime('now')
          WHERE match_id = ?
        `).run(matchId);
        db.prepare(`
          UPDATE matches SET is_active = 0, unmatched_by = 'SYSTEM', unmatched_reason = 'SANDBOX_AUTO_TERMINATE', updated_at = datetime('now')
          WHERE id = ?
        `).run(matchId);
        this.releaseSessionLocks(session.id);
        ModerationService.logSecurityEvent('SAFE_CHAT_AUTO_TERMINATE', 'HIGH',
          `Match ${matchId} auto-terminated after 3+ moderation violations by ${senderUserId}`, senderUserId);
      }

      return { success: false, moderation, sessionStatus: session.status, activeSeconds, remainingSeconds };
    }

    const messageId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, match_id, sender_id, recipient_id, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(messageId, matchId, senderUserId, recipientUserId, content.trim().slice(0, 1000));

    db.prepare(`
      UPDATE safe_chat_sessions SET message_count = message_count + 1, updated_at = datetime('now')
      WHERE match_id = ?
    `).run(matchId);

    if (moderation.action === 'WARNED') {
      db.prepare(`
        INSERT INTO moderated_messages (id, match_id, message_id, sender_id, content_snapshot, flags, action_taken, moderation_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), matchId, messageId, senderUserId, content.trim().slice(0, 500), JSON.stringify(moderation.flags), moderation.action, moderation.score);
    }

    return { success: true, messageId, moderation, sessionStatus: session.status, activeSeconds, remainingSeconds };
  }

  // ── History & Utilities ─────────────────────────────────────────────────────

  public static getChatHistory(matchId: string, limit = 50): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT m.*, p.display_name as sender_name
      FROM messages m
      LEFT JOIN profiles p ON p.user_id = m.sender_id
      WHERE m.match_id = ?
      ORDER BY m.created_at ASC
      LIMIT ?
    `).all(matchId, limit) as any[];
  }

  /**
   * Get human-readable status banner for Telegram bot UI.
   */
  public static getStatusBanner(status: SessionStatus, activeSeconds: number): string {
    const remaining = Math.max(0, MAX_ACTIVE_SECONDS - activeSeconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    switch (status) {
      case 'SAFE_CHAT_WAITING':
        return '⏳ *Menunggu match bergabung ke sesi...*\nTimer belum dimulai.';
      case 'SAFE_CHAT_ACTIVE':
        return `🛡️ *NIVA Safe Chat — Sesi Eksklusif Aktif*\n⏱ Waktu aktif tersisa: *${timeStr}*\n\nSelama sesi ini, kamu tidak dapat mencari atau like profile lain.`;
      case 'SAFE_CHAT_PAUSED':
        return `⏸️ *Sesi Dijeda*\nMenunggu match kembali aktif…\n⏱ Waktu aktif tersisa: *${timeStr}* (dijeda)`;
      case 'SAFE_CHAT_COMPLETED':
        return '✅ *10 menit sesi aktif selesai!*\nKalian bisa memilih untuk melanjutkan secara pribadi di Telegram, tetap di NIVA, atau mengakhiri percakapan.';
      case 'PRIVATE_CHAT_PENDING':
        return '⏳ *Menunggu keputusan match...*\nSatu peserta sudah memilih. Menunggu yang lain.';
      case 'PRIVATE_CHAT_ENABLED':
        return '🎉 *Keduanya setuju!*\nKalian bisa melanjutkan percakapan di Telegram secara pribadi.';
      case 'ENDED_BY_INACTIVITY':
        return '⚠️ *Sesi berakhir karena salah satu peserta tidak kembali aktif.*\nKamu bisa mencari match baru sekarang.';
      case 'ENDED_BY_USER':
        return '👋 *Sesi percakapan telah diakhiri.*\nKamu bisa mencari match baru.';
      case 'BLOCKED':
        return '🚫 *Pengguna telah diblokir dan sesi dihentikan.*';
      case 'REPORTED':
        return '🚨 *Laporan dikirimkan. Tim moderasi akan meninjau.*';
    }
  }

  // ── Internal Helpers ────────────────────────────────────────────────────────

  private static buildStatusResponse(session: SafeChatSession): SessionStatusResponse {
    const userAActive = this.isUserActiveInWindow(session.user_a_id, HEARTBEAT_VALID_WINDOW_S);
    const userBActive = this.isUserActiveInWindow(session.user_b_id, HEARTBEAT_VALID_WINDOW_S);
    const bothActive = userAActive && userBActive;

    let inactiveSince: number | null = null;
    let gracePeriodRemainingSeconds: number | null = null;

    if (session.status === 'SAFE_CHAT_PAUSED' && session.paused_at) {
      const pausedMs = parseSqliteUtc(session.paused_at);
      inactiveSince = Math.round((Date.now() - pausedMs) / 1000);
      gracePeriodRemainingSeconds = Math.max(0, INACTIVITY_GRACE_PERIOD_S - inactiveSince);
    }

    return {
      sessionId: session.id,
      matchId: session.match_id,
      status: session.status,
      activeSeconds: session.active_seconds ?? 0,
      remainingSeconds: Math.max(0, MAX_ACTIVE_SECONDS - (session.active_seconds ?? 0)),
      userAActive,
      userBActive,
      bothActive,
      inactiveSince,
      gracePeriodRemainingSeconds,
      isTerminal: TERMINAL_STATUSES.includes(session.status),
      privateDecision: {
        userA: session.user_a_private_decision ?? null,
        userB: session.user_b_private_decision ?? null,
      },
    };
  }

  // ── Legacy compat: consent flow (kept for bot handlers) ────────────────────

  public static getPendingConsentsForUser(responderId: string): any[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM private_contact_consents
      WHERE responder_id = ? AND status = 'PENDING'
        AND datetime(expires_at) > datetime('now')
      ORDER BY requested_at DESC
    `).all(responderId) as any[];
  }

  public static getAcceptedConsent(matchId: string): any | null {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM private_contact_consents
      WHERE match_id = ? AND status = 'ACCEPTED'
      LIMIT 1
    `).get(matchId) as any || null;
  }
}
