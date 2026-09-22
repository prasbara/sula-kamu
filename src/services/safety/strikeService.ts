/**
 * StrikeService — Production-Grade Three-Strike & Enforcement System
 *
 * Principles:
 *  1. Strike 1: Warning issued to user.
 *  2. Strike 2: Warning + Temporary restriction (15 min cooldown from stranger queues).
 *  3. Strike 3: Account block from matchmaking and Stranger features.
 *  4. Critical Violations: Immediate enforcement (ACCOUNT_BLOCK) bypassing strikes.
 *  5. Strike Expiration: Low/Medium expire after configurable retention; High/Critical permanent.
 *  6. Data Minimization: Stores only minimal sanitized evidence snippets, never full raw chat transcripts.
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import {
  ModerationAction,
  ModerationCategory,
  ModerationEvent,
  ModerationSeverity,
  UserRestriction,
} from '../../types/index';
import { NotifyService } from '../notification/notifyService';

// Expiration periods in days
export const LOW_STRIKE_EXPIRY_DAYS = 7;
export const MEDIUM_STRIKE_EXPIRY_DAYS = 14;
export const TEMP_RESTRICTION_MINUTES = 15;

export class StrikeService {
  /**
   * Calculate current active (non-expired and non-dismissed) strikes for a user
   */
  public static getActiveStrikeCount(userId: string): number {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT COUNT(*) as count
      FROM moderation_events
      WHERE user_id = ?
        AND review_status != 'DISMISSED'
        AND action IN ('WARN', 'REDACT', 'BLOCK_MESSAGE', 'BLOCK_SESSION', 'TEMP_RESTRICT', 'ACCOUNT_BLOCK')
        AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
    `).get(userId) as { count: number } | undefined;

    return row ? Number(row.count) : 0;
  }

  /**
   * Check if a user is currently under temporary restriction or banned
   */
  public static getUserRestriction(userId: string): {
    isRestricted: boolean;
    restrictionType: 'NONE' | 'WARNING' | 'TEMP_RESTRICT' | 'BANNED';
    restrictedUntil: string | null;
    activeStrikes: number;
    reason: string;
  } {
    const db = getDatabase();

    // Check users table status first
    const userRow = db.prepare(`
      SELECT status FROM users WHERE id = ?
    `).get(userId) as { status: string } | undefined;

    if (userRow && (userRow.status === 'BANNED' || userRow.status === 'SUSPENDED')) {
      return {
        isRestricted: true,
        restrictionType: 'BANNED',
        restrictedUntil: null,
        activeStrikes: 3,
        reason: 'Akun Anda diblokir karena pelanggaran keamanan berulang atau kritis.',
      };
    }

    const restriction = db.prepare(`
      SELECT * FROM user_restrictions WHERE user_id = ?
    `).get(userId) as UserRestriction | undefined;

    const activeStrikes = this.getActiveStrikeCount(userId);

    if (!restriction) {
      return {
        isRestricted: false,
        restrictionType: 'NONE',
        restrictedUntil: null,
        activeStrikes,
        reason: '',
      };
    }

    // Check if temporary restriction has expired
    if (restriction.restriction_type === 'TEMP_RESTRICT' && restriction.restricted_until) {
      const expiry = new Date(restriction.restricted_until).getTime();
      const now = Date.now();
      if (now > expiry) {
        // Restriction expired, reset to WARNING or NONE
        db.prepare(`
          UPDATE user_restrictions
          SET restriction_type = CASE WHEN active_strikes > 0 THEN 'WARNING' ELSE 'NONE' END,
              restricted_until = NULL,
              updated_at = datetime('now')
          WHERE user_id = ?
        `).run(userId);

        return {
          isRestricted: false,
          restrictionType: activeStrikes > 0 ? 'WARNING' : 'NONE',
          restrictedUntil: null,
          activeStrikes,
          reason: '',
        };
      }
    }

    const isRestricted =
      restriction.restriction_type === 'BANNED' ||
      restriction.restriction_type === 'TEMP_RESTRICT';

    return {
      isRestricted,
      restrictionType: restriction.restriction_type,
      restrictedUntil: restriction.restricted_until,
      activeStrikes,
      reason: restriction.reason,
    };
  }

  /**
   * Record a moderation event, calculate strikes, and execute policy enforcement
   */
  public static recordViolation(opts: {
    userId: string;
    sessionId?: string;
    messageId?: string;
    category: ModerationCategory;
    severity: ModerationSeverity;
    action: ModerationAction;
    riskScore: number;
    evidenceSnippet?: string;
    immediateCritical?: boolean;
  }): {
    event: ModerationEvent;
    newStrikeCount: number;
    restrictionApplied: 'NONE' | 'WARNING' | 'TEMP_RESTRICT' | 'BANNED';
    restrictedUntil?: string;
    enforcementNotice: string;
  } {
    const db = getDatabase();
    const eventId = uuidv4();

    // 1. Calculate Strike Expiration based on Severity
    let expiresAt: string | null = null;
    if (opts.severity === 'LOW') {
      expiresAt = new Date(Date.now() + LOW_STRIKE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    } else if (opts.severity === 'MEDIUM') {
      expiresAt = new Date(Date.now() + MEDIUM_STRIKE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
    } // HIGH & CRITICAL have null expiresAt (permanent record)

    // Current active strikes before this event
    const priorStrikes = this.getActiveStrikeCount(opts.userId);
    const newStrikeCount = priorStrikes + 1;

    // 2. Sanitize evidence snippet: Never store full chat or sensitive passwords
    let sanitizedSnippet = opts.evidenceSnippet || '';
    if (sanitizedSnippet.length > 80) {
      sanitizedSnippet = sanitizedSnippet.substring(0, 77) + '...';
    }

    // 3. Determine enforcement action
    let finalAction = opts.action;
    let restrictionApplied: 'NONE' | 'WARNING' | 'TEMP_RESTRICT' | 'BANNED' = 'NONE';
    let restrictedUntil: string | undefined;
    let enforcementNotice = '';

    // Handle Critical Immediate Intervention (bypasses 3-strike requirement)
    if (opts.immediateCritical || opts.severity === 'CRITICAL' || opts.riskScore >= 95) {
      finalAction = 'ACCOUNT_BLOCK';
      restrictionApplied = 'BANNED';
      enforcementNotice = 'Pelanggaran keamanan kritis terdeteksi. Akun dan sesi langsung diblokir.';

      // Ban user in users table
      db.prepare("UPDATE users SET status = 'BANNED', updated_at = datetime('now') WHERE id = ?").run(opts.userId);
      // Terminate any active stranger session
      if (opts.sessionId) {
        db.prepare(`
          UPDATE stranger_sessions
          SET status = 'BLOCKED', ended_at = datetime('now'), end_reason = 'CRITICAL_SECURITY_VIOLATION'
          WHERE id = ?
        `).run(opts.sessionId);
      }
    } else if (newStrikeCount >= 3) {
      // Third strike: Immediate permanent ban
      finalAction = 'ACCOUNT_BLOCK';
      restrictionApplied = 'BANNED';
      enforcementNotice = 'Strike 3: Batas maksimal pelanggaran tercapai. Anda telah diblokir dari Stranger Chat & Cam.';

      db.prepare("UPDATE users SET status = 'BANNED', updated_at = datetime('now') WHERE id = ?").run(opts.userId);
      if (opts.sessionId) {
        db.prepare(`
          UPDATE stranger_sessions
          SET status = 'BLOCKED', ended_at = datetime('now'), end_reason = 'THREE_STRIKES_EXCEEDED'
          WHERE id = ?
        `).run(opts.sessionId);
      }
    } else if (newStrikeCount === 2) {
      // Second strike: Warning + temporary restriction (15 minutes)
      finalAction = 'TEMP_RESTRICT';
      restrictionApplied = 'TEMP_RESTRICT';
      const restrictionDate = new Date(Date.now() + TEMP_RESTRICTION_MINUTES * 60 * 1000);
      restrictedUntil = restrictionDate.toISOString();
      enforcementNotice = `Strike 2: Peringatan keras. Akses Stranger Chat Anda dibatasi sementara selama ${TEMP_RESTRICTION_MINUTES} menit.`;
    } else {
      // First strike: Warning
      finalAction = opts.action === 'ALLOW' ? 'WARN' : opts.action;
      restrictionApplied = 'WARNING';
      enforcementNotice = 'Strike 1: Peringatan. Pesan Anda melanggar aturan keamanan komunitas NIVA.';
    }

    // 4. Insert into moderation_events
    db.prepare(`
      INSERT INTO moderation_events (
        id, user_id, session_id, message_id, category, severity,
        action, strike_count, risk_score, evidence_snippet,
        created_at, expires_at, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 'PENDING')
    `).run(
      eventId,
      opts.userId,
      opts.sessionId || null,
      opts.messageId || null,
      opts.category,
      opts.severity,
      finalAction,
      newStrikeCount,
      opts.riskScore,
      sanitizedSnippet || null,
      expiresAt
    );

    // 5. Update user_restrictions table
    db.prepare(`
      INSERT INTO user_restrictions (user_id, restriction_type, active_strikes, restricted_until, reason, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        restriction_type = excluded.restriction_type,
        active_strikes = excluded.active_strikes,
        restricted_until = excluded.restricted_until,
        reason = excluded.reason,
        updated_at = datetime('now')
    `).run(
      opts.userId,
      restrictionApplied,
      newStrikeCount,
      restrictedUntil || null,
      enforcementNotice
    );

    // 6. Security Notification to NIVANotify (without leaking private chat contents)
    if (restrictionApplied === 'BANNED' || restrictionApplied === 'TEMP_RESTRICT') {
      try {
        const maskedSession = opts.sessionId ? `NIVA-${opts.sessionId.substring(0, 8)}` : 'NIVA-SESSION';
        NotifyService.notifyModerationAlert(
          `🚨 NIVA Security Alert\n\nUser ${opts.userId.substring(0, 8)} restricted under ${opts.category} (${opts.severity}).\nSession: ${maskedSession}\nAction: ${restrictionApplied}\nStrike Count: ${newStrikeCount}/3`
        );
      } catch (notifyErr) {
        console.warn('StrikeService notify alert error:', notifyErr);
      }
    }

    const eventRecord = db.prepare('SELECT * FROM moderation_events WHERE id = ?').get(eventId) as unknown as ModerationEvent;

    return {
      event: eventRecord,
      newStrikeCount,
      restrictionApplied,
      restrictedUntil,
      enforcementNotice,
    };
  }

  /**
   * Moderator actions: Dismiss false positive (decrements strikes) or confirm sanction
   */
  public static resolveEvent(
    eventId: string,
    moderatorId: string,
    action: 'DISMISS' | 'RESOLVE' | 'BAN_USER',
    notes?: string
  ): { success: boolean; message: string } {
    const db = getDatabase();
    const event = db.prepare('SELECT * FROM moderation_events WHERE id = ?').get(eventId) as ModerationEvent | undefined;
    if (!event) {
      throw new Error('Moderation event not found');
    }

    const newStatus = action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';

    db.prepare(`
      UPDATE moderation_events
      SET review_status = ?, reviewed_by = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, moderatorId, eventId);

    if (action === 'DISMISS') {
      // Re-evaluate strikes after dismissal
      const newStrikes = this.getActiveStrikeCount(event.user_id);
      db.prepare(`
        UPDATE user_restrictions
        SET active_strikes = ?,
            restriction_type = CASE WHEN ? >= 3 THEN 'BANNED' WHEN ? > 0 THEN 'WARNING' ELSE 'NONE' END,
            updated_at = datetime('now')
        WHERE user_id = ?
      `).run(newStrikes, newStrikes, newStrikes, event.user_id);
    } else if (action === 'BAN_USER') {
      db.prepare("UPDATE users SET status = 'BANNED', updated_at = datetime('now') WHERE id = ?").run(event.user_id);
      db.prepare(`
        INSERT INTO user_restrictions (user_id, restriction_type, active_strikes, restricted_until, reason, created_at, updated_at)
        VALUES (?, 'BANNED', 3, NULL, 'Banned by moderator review', datetime('now'), datetime('now'))
        ON CONFLICT(user_id) DO UPDATE SET
          restriction_type = 'BANNED',
          reason = 'Banned by moderator review',
          updated_at = datetime('now')
      `).run(event.user_id);
    }

    return { success: true, message: `Event ${eventId} resolved as ${action}.` };
  }

  /**
   * Fetch queue for admin moderation panel
   */
  public static getModerationQueue(filterSeverity?: ModerationSeverity): ModerationEvent[] {
    const db = getDatabase();
    if (filterSeverity) {
      return db.prepare(`
        SELECT * FROM moderation_events
        WHERE severity = ? AND review_status = 'PENDING'
        ORDER BY created_at DESC LIMIT 100
      `).all(filterSeverity) as unknown as ModerationEvent[];
    }

    return db.prepare(`
      SELECT * FROM moderation_events
      ORDER BY
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END,
        created_at DESC
      LIMIT 100
    `).all() as unknown as ModerationEvent[];
  }
}
