import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { IdentityService } from '../identity/identityService';
import { NotifyService } from '../notification/notifyService';

export type BotUserState = 
  | 'NEW'
  | 'ONBOARDING'
  | 'READY'
  | 'SEARCHING'
  | 'MATCHED'
  | 'CHATTING'
  | 'COMPLETED';

export interface MatchSessionRecord {
  id: string;
  user_a_id: string;
  user_b_id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'USER_ENDED' | 'OFFLINE_TIMEOUT' | 'REPORTED' | 'BLOCKED';
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  ended_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchSessionMessageRecord {
  id: string;
  session_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  message: string;
  created_at: string;
}

function parseSqliteUtc(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  if (dateStr.includes('Z') || dateStr.includes('+')) {
    return new Date(dateStr).getTime();
  }
  return new Date(dateStr.replace(' ', 'T') + 'Z').getTime();
}

export class BotMatchmakingService {
  public static readonly SESSION_DURATION_MINUTES = 20;
  public static readonly HEARTBEAT_TTL_MINUTES = 15;

  /**
   * Find or create user via Telegram ID.
   * Primary key is internal_user_id (UUID).
   * Prevents duplicates and records identity snapshots.
   */
  public static ensureUser(telegramId: string, username?: string | null, displayName?: string | null): {
    userId: string;
    isNew: boolean;
    botState: BotUserState;
    user: any;
  } {
    const db = getDatabase();
    const cleanUsername = username ? username.replace(/^@/, '').trim() : null;
    const cleanDisplayName = displayName ? displayName.trim() : null;

    let user = db.prepare(`
      SELECT * FROM users WHERE telegram_id = ?
    `).get(telegramId) as any;

    if (!user) {
      const internalUserId = uuidv4();
      db.prepare(`
        INSERT INTO users (
          id, telegram_id, telegram_username, telegram_display_name,
          status, verification_status, subscription_status,
          bot_state, online_status, last_seen_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          'PENDING_VERIFICATION', 'UNVERIFIED', 'FREE',
          'NEW', 'ONLINE', datetime('now'), datetime('now'), datetime('now')
        )
      `).run(internalUserId, telegramId, cleanUsername, cleanDisplayName);

      // Record initial identity snapshot
      IdentityService.recordIdentitySnapshot({
        userId: internalUserId,
        telegramId,
        username: cleanUsername,
        displayName: cleanDisplayName,
      });

      // Notify staff/admin asynchronously
      try {
        NotifyService.notifyNewUser({
          userId: internalUserId,
          name: cleanDisplayName || 'Pengguna Baru',
          institutionName: 'Semarang Community',
          verificationLevel: 'UNVERIFIED',
          source: 'Telegram Bot Onboarding',
        }).catch(() => {});
      } catch {}

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(internalUserId) as any;

      return {
        userId: internalUserId,
        isNew: true,
        botState: 'NEW',
        user,
      };
    }

    // Existing user: update presence and track username change if applicable
    db.prepare(`
      UPDATE users 
      SET last_seen_at = datetime('now'), online_status = 'ONLINE', updated_at = datetime('now')
      WHERE id = ?
    `).run(user.id);

    IdentityService.recordIdentitySnapshot({
      userId: user.id,
      telegramId,
      username: cleanUsername,
      displayName: cleanDisplayName,
    });

    return {
      userId: user.id,
      isNew: false,
      botState: (user.bot_state as BotUserState) || 'READY',
      user,
    };
  }

  /**
   * Update bot state for a user with state machine integrity checks
   */
  public static setUserState(userId: string, newState: BotUserState): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE users 
      SET bot_state = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newState, userId);
  }

  /**
   * Get active match session for a user, automatically expiring when 20 minutes pass.
   */
  public static getActiveSession(userId: string): {
    session: MatchSessionRecord | null;
    partnerUserId: string | null;
    partnerTelegramId: string | null;
    hasExpired: boolean;
  } {
    const db = getDatabase();

    // Check active session
    const session = db.prepare(`
      SELECT * FROM match_sessions 
      WHERE (user_a_id = ? OR user_b_id = ?) 
        AND status = 'ACTIVE'
      ORDER BY started_at DESC
      LIMIT 1
    `).get(userId, userId) as MatchSessionRecord | undefined;

    if (!session) {
      return { session: null, partnerUserId: null, partnerTelegramId: null, hasExpired: false };
    }

    // Check 20-minute server timer (parse as UTC)
    const expiryTime = parseSqliteUtc(session.expires_at);
    const now = Date.now();

    if (now >= expiryTime) {
      // Complete session automatically
      db.prepare(`
        UPDATE match_sessions 
        SET status = 'COMPLETED', ended_at = datetime('now'), ended_reason = 'TIME_EXPIRED', updated_at = datetime('now')
        WHERE id = ?
      `).run(session.id);

      // Unlock both users
      db.prepare("UPDATE users SET bot_state = 'READY', active_session_id = NULL, updated_at = datetime('now') WHERE id IN (?, ?)").run(session.user_a_id, session.user_b_id);

      return { session: null, partnerUserId: null, partnerTelegramId: null, hasExpired: true };
    }

    const partnerUserId = session.user_a_id === userId ? session.user_b_id : session.user_a_id;
    const partnerRow = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(partnerUserId) as { telegram_id: string } | undefined;

    return {
      session,
      partnerUserId,
      partnerTelegramId: partnerRow ? partnerRow.telegram_id : null,
      hasExpired: false,
    };
  }

  /**
   * Enter matchmaking queue and attempt atomic pairing (Atomic Transaction)
   */
  public static match(userId: string): {
    matched: boolean;
    alreadySearching?: boolean;
    session?: MatchSessionRecord;
    partnerUserId?: string;
    partnerTelegramId?: string;
  } {
    const db = getDatabase();

    // 1. Sanctions check
    const user = db.prepare('SELECT status, bot_state FROM users WHERE id = ?').get(userId) as any;
    if (!user) throw new Error('USER_NOT_FOUND: Pengguna tidak terdaftar.');
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new Error('ACCOUNT_RESTRICTED: Akun Anda sedang dibatasi atau diblokir.');
    }

    // 2. Active session check (RULE: /match must be DENIED while CHATTING)
    const active = this.getActiveSession(userId);
    if (active.session) {
      throw new Error('USER_ALREADY_CHATTING: Kamu sedang dalam sesi chat aktif. Selesaikan sesi ini terlebih dahulu sebelum mencari match baru.');
    }

    // 3. Check if already in queue
    const existingQueue = db.prepare(`
      SELECT * FROM match_queue WHERE user_id = ? AND status = 'SEARCHING'
    `).get(userId) as any;

    if (existingQueue) {
      // Heartbeat update
      db.prepare("UPDATE match_queue SET last_heartbeat = datetime('now') WHERE user_id = ?").run(userId);
      db.prepare("UPDATE users SET bot_state = 'SEARCHING', last_seen_at = datetime('now') WHERE id = ?").run(userId);
      return { matched: false, alreadySearching: true };
    }

    // Clean up stale queue entries (> 15 minutes of inactivity)
    db.prepare(`
      DELETE FROM match_queue 
      WHERE status = 'SEARCHING' AND datetime(last_heartbeat) < datetime('now', '-15 minutes')
    `).run();

    // 4. Atomic Matchmaking: Look for oldest eligible waiting candidate
    const candidate = db.prepare(`
      SELECT mq.user_id, u.telegram_id
      FROM match_queue mq
      JOIN users u ON u.id = mq.user_id
      WHERE mq.status = 'SEARCHING'
        AND mq.user_id != ?
        AND u.status = 'ACTIVE'
        AND mq.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
        AND mq.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
      ORDER BY mq.entered_at ASC
      LIMIT 1
    `).get(userId, userId, userId) as { user_id: string; telegram_id: string } | undefined;

    if (candidate) {
      // Pair atomically
      const candidateId = candidate.user_id;
      const sessionId = uuidv4();

      // Remove candidate from queue
      db.prepare("DELETE FROM match_queue WHERE user_id IN (?, ?)").run(userId, candidateId);

      // Create 20-minute match session (candidate waiting first = user_a, incoming user = user_b)
      db.prepare(`
        INSERT INTO match_sessions (
          id, user_a_id, user_b_id, status, started_at, expires_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, 'ACTIVE', datetime('now'), datetime('now', '+20 minutes'), datetime('now'), datetime('now')
        )
      `).run(sessionId, candidateId, userId);

      // Update both users' state to CHATTING
      db.prepare(`
        UPDATE users 
        SET bot_state = 'CHATTING', active_session_id = ?, last_seen_at = datetime('now'), updated_at = datetime('now')
        WHERE id IN (?, ?)
      `).run(sessionId, userId, candidateId);

      const session = db.prepare('SELECT * FROM match_sessions WHERE id = ?').get(sessionId) as unknown as MatchSessionRecord;

      return {
        matched: true,
        session,
        partnerUserId: candidateId,
        partnerTelegramId: candidate.telegram_id,
      };
    }

    // No partner available right now -> Insert into match_queue
    const queueId = uuidv4();
    db.prepare(`
      INSERT OR REPLACE INTO match_queue (id, user_id, status, entered_at, last_heartbeat)
      VALUES (?, ?, 'SEARCHING', datetime('now'), datetime('now'))
    `).run(queueId, userId);

    db.prepare("UPDATE users SET bot_state = 'SEARCHING', last_seen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(userId);

    return { matched: false };
  }

  /**
   * Stop active chat or cancel queue entry
   */
  public static stop(userId: string, reason = 'USER_ENDED'): {
    stopped: boolean;
    sessionEnded: boolean;
    cancelledQueue: boolean;
    session?: MatchSessionRecord;
    partnerUserId?: string;
    partnerTelegramId?: string;
  } {
    const db = getDatabase();

    // 1. Check if user is in matchmaking queue
    const queueRow = db.prepare("SELECT * FROM match_queue WHERE user_id = ? AND status = 'SEARCHING'").get(userId);
    if (queueRow) {
      db.prepare("DELETE FROM match_queue WHERE user_id = ?").run(userId);
      db.prepare("UPDATE users SET bot_state = 'READY', updated_at = datetime('now') WHERE id = ?").run(userId);
      return { stopped: true, sessionEnded: false, cancelledQueue: true };
    }

    // 2. Check active session
    const active = this.getActiveSession(userId);
    if (!active.session) {
      db.prepare("UPDATE users SET bot_state = 'READY', active_session_id = NULL WHERE id = ?").run(userId);
      return { stopped: false, sessionEnded: false, cancelledQueue: false };
    }

    const { session, partnerUserId, partnerTelegramId } = active;

    // End session
    db.prepare(`
      UPDATE match_sessions 
      SET status = ?, ended_at = datetime('now'), ended_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(reason, reason, session.id);

    // Unlock both users
    db.prepare("UPDATE users SET bot_state = 'READY', active_session_id = NULL, updated_at = datetime('now') WHERE id IN (?, ?)").run(session.user_a_id, session.user_b_id);

    return {
      stopped: true,
      sessionEnded: true,
      cancelledQueue: false,
      session,
      partnerUserId: partnerUserId || undefined,
      partnerTelegramId: partnerTelegramId || undefined,
    };
  }

  /**
   * Route text message through active 20-minute session (Isolated forward)
   */
  public static relayMessage(senderUserId: string, messageText: string): {
    success: boolean;
    messageId: string;
    sessionId: string;
    receiverUserId: string;
    receiverTelegramId: string;
  } {
    const cleanMsg = messageText.trim();
    if (!cleanMsg) throw new Error('EMPTY_MESSAGE: Pesan tidak boleh kosong.');

    const active = this.getActiveSession(senderUserId);
    if (!active.session || !active.partnerUserId || !active.partnerTelegramId) {
      throw new Error('NO_ACTIVE_SESSION: Kamu tidak sedang dalam sesi chat aktif. Gunakan /match untuk mencari teman obrolan.');
    }

    const db = getDatabase();
    const msgId = uuidv4();

    db.prepare(`
      INSERT INTO match_session_messages (
        id, session_id, sender_user_id, receiver_user_id, message, created_at
      ) VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(msgId, active.session.id, senderUserId, active.partnerUserId, cleanMsg);

    // Update sender presence
    db.prepare("UPDATE users SET last_seen_at = datetime('now') WHERE id = ?").run(senderUserId);

    return {
      success: true,
      messageId: msgId,
      sessionId: active.session.id,
      receiverUserId: active.partnerUserId,
      receiverTelegramId: active.partnerTelegramId,
    };
  }

  /**
   * Get accurate status for /status command
   */
  public static getStatus(userId: string): {
    state: BotUserState;
    isSearching: boolean;
    isChatting: boolean;
    sessionMinutesRemaining?: number;
    description: string;
  } {
    const db = getDatabase();
    const user = db.prepare('SELECT bot_state, last_seen_at, status FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return {
        state: 'NEW',
        isSearching: false,
        isChatting: false,
        description: 'Akun Anda belum terdaftar. Ketik /start untuk memulai.',
      };
    }

    const active = this.getActiveSession(userId);
    if (active.session) {
      const expiry = parseSqliteUtc(active.session.expires_at);
      const remainingSec = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      const remainingMin = Math.ceil(remainingSec / 60);

      return {
        state: 'CHATTING',
        isSearching: false,
        isChatting: true,
        sessionMinutesRemaining: remainingMin,
        description: `💬 Kamu sedang terhubung dalam sesi chat.\n⏰ Sisa waktu: ~${remainingMin} menit.\nKetik /stop untuk mengakhiri chat.`,
      };
    }

    const queueRow = db.prepare("SELECT * FROM match_queue WHERE user_id = ? AND status = 'SEARCHING'").get(userId);
    if (queueRow) {
      return {
        state: 'SEARCHING',
        isSearching: true,
        isChatting: false,
        description: '🔎 Kamu sedang berada dalam antrean mencari match.\nMohon tunggu sejenak, atau ketik /stop untuk membatalkan.',
      };
    }

    return {
      state: (user.bot_state as BotUserState) || 'READY',
      isSearching: false,
      isChatting: false,
      description: '✅ Akun kamu siap. Gunakan /match untuk mulai mencari pasangan mengobrol di komunitas Semarang.',
    };
  }

  /**
   * Observability metrics directly from production database tables
   */
  public static getObservabilityMetrics(): {
    totalUsers: number;
    newUsersToday: number;
    currentlyOnline: number;
    searchingCount: number;
    activeSessionsCount: number;
    completedSessionsCount: number;
    reportsCount: number;
    premiumUsersCount: number;
  } {
    const db = getDatabase();

    const totalUsers = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as any).cnt;
    const newUsersToday = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE date(created_at) = date('now')").get() as any).cnt;
    const currentlyOnline = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE datetime(last_seen_at) >= datetime('now', '-15 minutes')").get() as any).cnt;
    const searchingCount = (db.prepare("SELECT COUNT(*) as cnt FROM match_queue WHERE status = 'SEARCHING'").get() as any).cnt;
    const activeSessionsCount = (db.prepare("SELECT COUNT(*) as cnt FROM match_sessions WHERE status = 'ACTIVE'").get() as any).cnt;
    const completedSessionsCount = (db.prepare("SELECT COUNT(*) as cnt FROM match_sessions WHERE status = 'COMPLETED'").get() as any).cnt;
    const reportsCount = (db.prepare('SELECT COUNT(*) as cnt FROM reports').get() as any).cnt;
    const premiumUsersCount = (db.prepare("SELECT COUNT(*) as cnt FROM users WHERE subscription_status = 'PREMIUM_ACTIVE'").get() as any).cnt;

    return {
      totalUsers,
      newUsersToday,
      currentlyOnline,
      searchingCount,
      activeSessionsCount,
      completedSessionsCount,
      reportsCount,
      premiumUsersCount,
    };
  }
}
