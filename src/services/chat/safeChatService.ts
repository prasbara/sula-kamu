/**
 * SafeChatService — NIVA Safe Chat Sandbox
 *
 * Enforces:
 *   1. 10-minute controlled sandbox for every new match
 *   2. Server-side message moderation (anti-scam, anti-nude, anti-phishing)
 *   3. Mutual double opt-in consent before private Telegram contact exchange
 *
 * All state is persisted in the database — NO in-memory-only state.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { ModerationService } from '../safety/moderationService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatPhase = 'SANDBOX' | 'UNLOCKED' | 'TERMINATED';

export interface SafeChatSession {
  id: string;
  match_id: string;
  started_at: string;
  sandbox_ends_at: string;
  phase: ChatPhase;
  message_count: number;
  flagged_message_count: number;
  last_moderation_action: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModerationResult {
  allowed: boolean;
  action: 'ALLOWED' | 'WARNED' | 'BLOCKED' | 'ESCALATED';
  flags: string[];
  score: number;
  userMessage?: string; // Shown to the sending user if not ALLOWED
}

export interface PrivateConsentRequest {
  id: string;
  match_id: string;
  requester_id: string;
  responder_id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  requested_at: string;
  responded_at: string | null;
  expires_at: string;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  moderation: ModerationResult;
  sandboxPhase: ChatPhase;
  /** Minutes remaining in sandbox (null if phase ≠ SANDBOX) */
  sandboxMinutesRemaining: number | null;
  /** Whether sandbox JUST expired with this message */
  sandboxJustUnlocked: boolean;
}

// ─── Anti-Abuse Pattern Database ─────────────────────────────────────────────

/** Phone number patterns — Indonesian and international */
const PHONE_PATTERNS = [
  /\b0\d{8,12}\b/,
  /\b(\+62|62)\s?\d{8,12}\b/,
  /\b08[1-9][0-9]{7,10}\b/,
  /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/,
];

/** Social media / external contact patterns */
const CONTACT_LEAK_PATTERNS = [
  // Telegram usernames
  /\bt\.me\/[a-zA-Z0-9_]{3,}/i,
  /@[a-zA-Z0-9_]{3,}\b/,  // @username
  // WhatsApp
  /wa\.me\/\d+/i,
  /whatsapp[:\s]*(\+?\d{8,})/i,
  // Common IM redirects
  /\bline[:\s]*id\b/i,
  /\binstagram[:\s]*[a-z0-9_.]{3,}/i,
];

/** External link / phishing patterns */
const LINK_PATTERNS = [
  /https?:\/\/[^\s]+/i,
  /bit\.ly\/[a-zA-Z0-9]+/i,
  /tinyurl\.com\/[a-zA-Z0-9]+/i,
  /\b[a-zA-Z0-9-]+\.(com|net|org|id|io|co|xyz|info|biz)\b/i,
];

/** Financial / scam bait patterns */
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

/** Explicit/sexual content patterns */
const EXPLICIT_PATTERNS = [
  /\b(nude|naked|bugil|telanjang|bokep|porno|ngentot|sex(y)?|colmek|masturbasi)\b/i,
  /\b(xxx|18\+|dewasa|konten\s+panas|foto\s+panas|kirimin\s+foto)\b/i,
];

/** Doxxing patterns */
const DOXXING_PATTERNS = [
  /\b(alamat\s+rumah|nomor\s+nim|tanggal\s+lahir)\b/i,
  /\bktp\s+(nomor|no\.?)\b/i,
];

// ─── Scoring weights ──────────────────────────────────────────────────────────

const PATTERN_SCORES: { patterns: RegExp[]; score: number; flag: string }[] = [
  { patterns: PHONE_PATTERNS,    score: 0.85, flag: 'PHONE_NUMBER'    },
  { patterns: CONTACT_LEAK_PATTERNS, score: 0.80, flag: 'EXTERNAL_CONTACT' },
  { patterns: LINK_PATTERNS,     score: 0.75, flag: 'EXTERNAL_LINK'   },
  { patterns: SCAM_PATTERNS,     score: 0.90, flag: 'SCAM_PATTERN'    },
  { patterns: EXPLICIT_PATTERNS, score: 1.00, flag: 'EXPLICIT_CONTENT' },
  { patterns: DOXXING_PATTERNS,  score: 0.85, flag: 'DOXXING'         },
];

// ─── SafeChatService ──────────────────────────────────────────────────────────

export class SafeChatService {
  /** Sandbox duration: 10 minutes */
  static readonly SANDBOX_DURATION_MS = 10 * 60 * 1000;
  /** Consent request expiry: 30 minutes */
  static readonly CONSENT_EXPIRY_MS = 30 * 60 * 1000;

  // ── Session Management ──────────────────────────────────────────────────────

  /**
   * Get or create a SafeChatSession for a match.
   * Called the first time a chat is opened for a match.
   */
  public static getOrCreateSession(matchId: string): SafeChatSession {
    const db = getDatabase();
    const existing = db.prepare(
      'SELECT * FROM safe_chat_sessions WHERE match_id = ?'
    ).get(matchId) as SafeChatSession | undefined;

    if (existing) {
      // Auto-advance phase if sandbox time has elapsed
      if (existing.phase === 'SANDBOX') {
        const now = new Date();
        const endsAt = new Date(existing.sandbox_ends_at);
        if (now >= endsAt) {
          db.prepare(`
            UPDATE safe_chat_sessions
            SET phase = 'UNLOCKED', updated_at = datetime('now')
            WHERE match_id = ?
          `).run(matchId);
          return { ...existing, phase: 'UNLOCKED' };
        }
      }
      return existing;
    }

    // Create new session
    const sessionId = uuidv4();
    const now = new Date();
    const endsAt = new Date(now.getTime() + this.SANDBOX_DURATION_MS);

    db.prepare(`
      INSERT INTO safe_chat_sessions (id, match_id, started_at, sandbox_ends_at, phase)
      VALUES (?, ?, datetime('now'), ?, 'SANDBOX')
    `).run(sessionId, matchId, endsAt.toISOString());

    return db.prepare('SELECT * FROM safe_chat_sessions WHERE id = ?').get(sessionId) as unknown as SafeChatSession;
  }

  /**
   * Check current phase of a session — auto-advances SANDBOX → UNLOCKED after 10 min.
   */
  public static checkPhase(matchId: string): { phase: ChatPhase; minutesRemaining: number | null; justUnlocked: boolean } {
    const db = getDatabase();
    const session = db.prepare(
      'SELECT * FROM safe_chat_sessions WHERE match_id = ?'
    ).get(matchId) as SafeChatSession | undefined;

    if (!session) {
      return { phase: 'SANDBOX', minutesRemaining: 10, justUnlocked: false };
    }

    if (session.phase !== 'SANDBOX') {
      return { phase: session.phase, minutesRemaining: null, justUnlocked: false };
    }

    const now = new Date();
    const endsAt = new Date(session.sandbox_ends_at);
    const msRemaining = endsAt.getTime() - now.getTime();

    if (msRemaining <= 0) {
      // Auto-unlock
      db.prepare(`
        UPDATE safe_chat_sessions
        SET phase = 'UNLOCKED', updated_at = datetime('now')
        WHERE match_id = ?
      `).run(matchId);
      return { phase: 'UNLOCKED', minutesRemaining: null, justUnlocked: true };
    }

    const minutesRemaining = Math.ceil(msRemaining / 60000);
    return { phase: 'SANDBOX', minutesRemaining, justUnlocked: false };
  }

  // ── Message Moderation ──────────────────────────────────────────────────────

  /**
   * Analyse a message for safety violations.
   * Returns a ModerationResult with score, flags, and recommended action.
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
      userMessage = '🚫 Pesan Anda diblokir karena mengandung konten yang melanggar Community Guidelines NIVA (konten eksplisit/seksual). Pelanggaran berulang akan mengakibatkan penangguhan akun.';
    } else if (score >= 0.80) {
      action = 'BLOCKED';
      if (flags.includes('PHONE_NUMBER') || flags.includes('EXTERNAL_CONTACT')) {
        userMessage = '⚠️ Pesan diblokir. Berbagi nomor telepon atau akun media sosial dilarang selama fase obrolan aman (10 menit pertama). Gunakan fitur "Lanjut Berkenalan" setelah periode ini untuk bertukar kontak secara aman.';
      } else if (flags.includes('SCAM_PATTERN')) {
        userMessage = '🚨 Pesan diblokir. Terdeteksi pola percakapan yang berhubungan dengan penipuan keuangan. Jika Anda merasa ini adalah kesalahan, hubungi dukungan NIVA.';
      } else {
        userMessage = '⚠️ Pesan diblokir karena mengandung konten yang melanggar Community Guidelines NIVA.';
      }
    } else if (score >= 0.70) {
      action = 'WARNED';
      if (flags.includes('EXTERNAL_LINK')) {
        userMessage = '⚠️ Pesan Anda mengandung tautan eksternal dan telah ditandai. Di NIVA, hindari berbagi link yang tidak perlu demi keselamatan bersama.';
      } else {
        userMessage = '⚠️ Pesan Anda telah ditandai oleh sistem moderasi. Harap perhatikan Community Guidelines NIVA.';
      }
    }

    return { allowed: action !== 'BLOCKED', action, flags, score, userMessage };
  }

  /**
   * Send a moderated message inside the safe chat sandbox.
   * Handles: phase check, content moderation, DB write, flagging, escalation.
   */
  public static sendSandboxMessage(
    matchId: string,
    senderUserId: string,
    recipientUserId: string,
    content: string
  ): SendMessageResult {
    const db = getDatabase();

    // 1. Ensure session exists and get phase
    const session = this.getOrCreateSession(matchId);
    const { phase, minutesRemaining, justUnlocked } = this.checkPhase(matchId);

    // 2. Moderate content
    const moderation = this.moderateMessage(content);

    if (!moderation.allowed) {
      // Log blocked message for audit trail
      const blockedMsgId = uuidv4();
      db.prepare(`
        INSERT INTO moderated_messages (id, match_id, message_id, sender_id, content_snapshot, flags, action_taken, moderation_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), matchId, blockedMsgId, senderUserId,
        content.slice(0, 500),
        JSON.stringify(moderation.flags),
        moderation.action,
        moderation.score
      );

      // Increment flagged count
      db.prepare(`
        UPDATE safe_chat_sessions
        SET flagged_message_count = flagged_message_count + 1,
            last_moderation_action = ?,
            updated_at = datetime('now')
        WHERE match_id = ?
      `).run(moderation.action, matchId);

      // Auto-escalate if 3+ violations in sandbox
      const updatedSession = db.prepare('SELECT * FROM safe_chat_sessions WHERE match_id = ?').get(matchId) as unknown as SafeChatSession;
      if (updatedSession.flagged_message_count >= 3) {
        db.prepare(`
          UPDATE safe_chat_sessions
          SET phase = 'TERMINATED', updated_at = datetime('now')
          WHERE match_id = ?
        `).run(matchId);

        // Deactivate match and log security event
        db.prepare(`
          UPDATE matches
          SET is_active = 0, unmatched_by = 'SYSTEM', unmatched_reason = 'SANDBOX_AUTO_TERMINATE',
              updated_at = datetime('now')
          WHERE id = ?
        `).run(matchId);

        ModerationService.logSecurityEvent(
          'SAFE_CHAT_AUTO_TERMINATE',
          'HIGH',
          `Match ${matchId} auto-terminated after 3+ moderation violations by user ${senderUserId}`,
          senderUserId
        );
      }

      return {
        success: false,
        moderation,
        sandboxPhase: phase,
        sandboxMinutesRemaining: minutesRemaining,
        sandboxJustUnlocked: justUnlocked,
      };
    }

    // 3. Insert the message (content trimmed, max 1000 chars)
    const messageId = uuidv4();
    const cleanContent = content.trim().slice(0, 1000);

    db.prepare(`
      INSERT INTO messages (id, match_id, sender_id, recipient_id, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(messageId, matchId, senderUserId, recipientUserId, cleanContent);

    // 4. Update session message count
    db.prepare(`
      UPDATE safe_chat_sessions
      SET message_count = message_count + 1,
          updated_at = datetime('now')
      WHERE match_id = ?
    `).run(matchId);

    // 5. Log moderated_messages entry (ALLOWED)
    if (moderation.action === 'WARNED') {
      db.prepare(`
        INSERT INTO moderated_messages (id, match_id, message_id, sender_id, content_snapshot, flags, action_taken, moderation_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        uuidv4(), matchId, messageId, senderUserId,
        cleanContent.slice(0, 500),
        JSON.stringify(moderation.flags),
        moderation.action,
        moderation.score
      );
    }

    return {
      success: true,
      messageId,
      moderation,
      sandboxPhase: phase,
      sandboxMinutesRemaining: minutesRemaining,
      sandboxJustUnlocked: justUnlocked,
    };
  }

  // ── Private Contact Consent Flow ────────────────────────────────────────────

  /**
   * Request mutual private Telegram contact exchange.
   * Only allowed after sandbox phase has ended (UNLOCKED).
   * Returns error string if request cannot be made.
   */
  public static requestPrivateContact(
    matchId: string,
    requesterId: string,
    responderId: string
  ): { success: boolean; message: string; consentId?: string } {
    const db = getDatabase();

    // Must be UNLOCKED
    const { phase, minutesRemaining } = this.checkPhase(matchId);
    if (phase === 'SANDBOX') {
      return {
        success: false,
        message: `⏳ Fitur ini hanya tersedia setelah fase obrolan aman 10 menit selesai. Masih ${minutesRemaining} menit lagi. Gunakan waktu ini untuk lebih berkenalan secara aman di platform!`,
      };
    }
    if (phase === 'TERMINATED') {
      return {
        success: false,
        message: '🚫 Sesi obrolan ini telah dihentikan karena pelanggaran Community Guidelines.',
      };
    }

    // Check for existing PENDING request
    const existing = db.prepare(`
      SELECT * FROM private_contact_consents
      WHERE match_id = ? AND requester_id = ? AND status = 'PENDING'
    `).get(matchId, requesterId) as PrivateConsentRequest | undefined;

    if (existing) {
      return {
        success: false,
        message: '⏳ Anda sudah mengirimkan permintaan bertukar kontak. Menunggu persetujuan teman Anda.',
      };
    }

    // Expire old requests
    db.prepare(`
      UPDATE private_contact_consents
      SET status = 'EXPIRED', responded_at = datetime('now')
      WHERE match_id = ? AND status = 'PENDING'
        AND datetime(expires_at) < datetime('now')
    `).run(matchId);

    // Create new consent request
    const consentId = uuidv4();
    const expiresAt = new Date(Date.now() + this.CONSENT_EXPIRY_MS).toISOString();

    db.prepare(`
      INSERT INTO private_contact_consents
        (id, match_id, requester_id, responder_id, status, expires_at)
      VALUES (?, ?, ?, ?, 'PENDING', ?)
    `).run(consentId, matchId, requesterId, responderId, expiresAt);

    return {
      success: true,
      message: '✅ Permintaan bertukar kontak Telegram telah dikirimkan. Menunggu persetujuan teman Anda (berlaku 30 menit).',
      consentId,
    };
  }

  /**
   * Respond to a private contact consent request.
   */
  public static respondPrivateConsent(
    consentId: string,
    responderId: string,
    accept: boolean
  ): { success: boolean; message: string; consentRequest?: PrivateConsentRequest } {
    const db = getDatabase();

    const consent = db.prepare(
      "SELECT * FROM private_contact_consents WHERE id = ? AND status = 'PENDING'"
    ).get(consentId) as PrivateConsentRequest | undefined;

    if (!consent) {
      return { success: false, message: '❌ Permintaan tidak ditemukan atau sudah kadaluarsa.' };
    }

    if (consent.responder_id !== responderId) {
      return { success: false, message: '❌ Anda tidak berwenang merespons permintaan ini.' };
    }

    // Check expiry
    if (new Date(consent.expires_at) < new Date()) {
      db.prepare("UPDATE private_contact_consents SET status = 'EXPIRED' WHERE id = ?").run(consentId);
      return { success: false, message: '❌ Permintaan sudah kadaluarsa. Mintalah kembali.' };
    }

    const newStatus = accept ? 'ACCEPTED' : 'DECLINED';
    db.prepare(`
      UPDATE private_contact_consents
      SET status = ?, responded_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, consentId);

    const updated = db.prepare('SELECT * FROM private_contact_consents WHERE id = ?').get(consentId) as unknown as PrivateConsentRequest;

    if (accept) {
      return {
        success: true,
        message: '✅ Pertukaran kontak disetujui! Kedua pihak kini dapat saling menghubungi secara pribadi di Telegram.',
        consentRequest: updated,
      };
    }

    return {
      success: true,
      message: '❌ Permintaan bertukar kontak ditolak. Percakapan dapat dilanjutkan di platform NIVA.',
      consentRequest: updated,
    };
  }

  /**
   * Get pending consent requests targeting a specific user (to show notification).
   */
  public static getPendingConsentsForUser(responderId: string): PrivateConsentRequest[] {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM private_contact_consents
      WHERE responder_id = ? AND status = 'PENDING'
        AND datetime(expires_at) > datetime('now')
      ORDER BY requested_at DESC
    `).all(responderId) as unknown as PrivateConsentRequest[];
  }

  /**
   * Get accepted consent for a match (to reveal Telegram usernames).
   */
  public static getAcceptedConsent(matchId: string): PrivateConsentRequest | null {
    const db = getDatabase();
    return (db.prepare(`
      SELECT * FROM private_contact_consents
      WHERE match_id = ? AND status = 'ACCEPTED'
      LIMIT 1
    `).get(matchId) as unknown as PrivateConsentRequest) || null;
  }

  // ── Utilities ────────────────────────────────────────────────────────────────

  /**
   * Get last N messages for a match.
   */
  public static getChatHistory(matchId: string, limit = 10): any[] {
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
   * Get human-readable sandbox status banner for chat UI.
   */
  public static getSandboxStatusBanner(phase: ChatPhase, minutesRemaining: number | null): string {
    if (phase === 'SANDBOX') {
      return (
        `🛡️ *Obrolan Aman NIVA — Fase Sandbox*\n` +
        `Anda sedang dalam fase obrolan aman 10 menit.\n` +
        `⏱ Sisa waktu: *${minutesRemaining ?? '?'} menit*\n\n` +
        `Selama fase ini:\n` +
        `• Nomor HP dan akun media sosial otomatis diblokir\n` +
        `• Link eksternal dilarang\n` +
        `• Konten eksplisit langsung dihentikan\n\n` +
        `Setelah 10 menit, Anda dapat memilih untuk bertukar kontak Telegram secara aman melalui persetujuan bersama.`
      );
    }
    if (phase === 'UNLOCKED') {
      return (
        `✅ *Fase Sandbox Selesai!*\n` +
        `Anda telah melewati fase obrolan aman 10 menit.\n` +
        `Moderasi dasar tetap aktif. Gunakan tombol *"Lanjut Berkenalan"* untuk bertukar kontak Telegram secara aman melalui persetujuan bersama.`
      );
    }
    return (
      `🚫 *Sesi Dihentikan*\n` +
      `Percakapan ini telah dihentikan oleh sistem moderasi karena pelanggaran Community Guidelines.`
    );
  }

  // ── Exclusive Session & Discovery Lock ─────────────────────────────────────

  /**
   * Acquire exclusive lock for both participants in a safe chat match.
   * Neither user may discover, search, like, or start another match while locked.
   */
  public static acquireExclusiveLock(sessionId: string, userAId: string, userBId: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO user_exclusive_locks (user_id, session_id, locked_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET session_id = ?, locked_at = datetime('now'), released_at = NULL
    `).run(userAId, sessionId, sessionId);

    db.prepare(`
      INSERT INTO user_exclusive_locks (user_id, session_id, locked_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET session_id = ?, locked_at = datetime('now'), released_at = NULL
    `).run(userBId, sessionId, sessionId);
  }

  /**
   * Check if a user is currently locked to an exclusive safe chat session
   */
  public static isUserLocked(userId: string): { locked: boolean; sessionId?: string; partnerName?: string } {
    const db = getDatabase();
    const lock = db.prepare(`
      SELECT uel.session_id, scs.match_id
      FROM user_exclusive_locks uel
      JOIN safe_chat_sessions scs ON scs.id = uel.session_id
      WHERE uel.user_id = ? AND uel.released_at IS NULL AND scs.phase = 'SANDBOX'
    `).get(userId) as { session_id: string; match_id: string } | undefined;

    if (!lock) {
      return { locked: false };
    }

    // Get partner display name
    const match = db.prepare('SELECT user_a_id, user_b_id FROM matches WHERE id = ?').get(lock.match_id) as { user_a_id: string; user_b_id: string } | undefined;
    const partnerId = match?.user_a_id === userId ? match?.user_b_id : match?.user_a_id;
    const partner = partnerId ? db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(partnerId) as { display_name?: string } | undefined : undefined;

    return {
      locked: true,
      sessionId: lock.session_id,
      partnerName: partner?.display_name || 'Match Anda',
    };
  }

  /**
   * Release exclusive lock for a user and their partner
   */
  public static releaseExclusiveLock(userId: string): void {
    const db = getDatabase();
    const lock = db.prepare('SELECT session_id FROM user_exclusive_locks WHERE user_id = ? AND released_at IS NULL').get(userId) as { session_id: string } | undefined;
    if (lock) {
      db.prepare("UPDATE user_exclusive_locks SET released_at = datetime('now') WHERE session_id = ?").run(lock.session_id);
    }
  }

  /**
   * Record presence heartbeat for user
   */
  public static recordHeartbeat(userId: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO user_presence (user_id, last_heartbeat_at, presence_status, updated_at)
      VALUES (?, datetime('now'), 'ACTIVE', datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET 
        last_heartbeat_at = datetime('now'),
        presence_status = 'ACTIVE',
        updated_at = datetime('now')
    `).run(userId);
  }

  /**
   * Check if both users are mutually active within the last 60 seconds
   */
  public static checkMutualActive(userAId: string, userBId: string): boolean {
    const db = getDatabase();
    const presenceA = db.prepare("SELECT last_heartbeat_at FROM user_presence WHERE user_id = ? AND datetime(last_heartbeat_at) >= datetime('now', '-60 seconds')").get(userAId);
    const presenceB = db.prepare("SELECT last_heartbeat_at FROM user_presence WHERE user_id = ? AND datetime(last_heartbeat_at) >= datetime('now', '-60 seconds')").get(userBId);
    return !!(presenceA && presenceB);
  }
}
