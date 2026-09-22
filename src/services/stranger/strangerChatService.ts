/**
 * StrangerChatService — Production-Grade Anonymous 1-on-1 Text Chat
 *
 * Core Principles:
 *  1. Anonymity & Privacy: No personal data (phone, email, GPS, Telegram ID) ever exposed.
 *  2. Server-Authoritative Moderation: Messages pass ContentModerationPipeline before delivery.
 *  3. Data Minimization: Zero permanent storage of private chat messages.
 *     Messages reside in short-lived ephemeral buffers during active session only.
 *  4. Enforcement: Three-strike tracking, rate limiting, and immediate critical sanctions.
 *  5. Safety Actions: Instant Skip, Block (permanent), Report (with standard categories).
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import {
  ContentModerationResult,
  ModerationCategory,
  StrangerChatMessage,
} from '../../types/index';
import { ContentModerationPipeline, REDACTED_MESSAGE_NOTICE, MAX_MESSAGE_LENGTH } from '../safety/contentModerationPipeline';
import { StrikeService } from '../safety/strikeService';
import { StrangerCamService, SignalBus } from './strangerCamService';
import { NotifyService } from '../notification/notifyService';

// Ephemeral in-memory message store per session (data minimization: cleared on session end)
const sessionMessageStore = new Map<string, StrangerChatMessage[]>();

// Rate limiter per user (sliding window: timestamps of messages sent in last 60 seconds)
const userMessageRateMap = new Map<string, number[]>();

// Duplicate message detection (user_id -> { lastContent: string, lastTimestamp: number })
const userLastMessageMap = new Map<string, { content: string; timestamp: number }>();

export const MAX_MESSAGES_PER_MINUTE = 15;
export const MAX_SESSION_MESSAGES = 100;

export class StrangerChatService {
  /**
   * Enter anonymous text matchmaking queue
   */
  public static enterQueue(userId: string, interests: string[] = []): {
    matched: boolean;
    sessionId?: string;
    partnerAlias?: string;
    status: 'QUEUED' | 'CONNECTED';
  } {
    const db = getDatabase();

    // 1. Eligibility Check (18+ gate & Semarang location)
    const eligibility = StrangerCamService.checkEligibility(userId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Anda belum memenuhi syarat untuk masuk ke antrean Stranger Chat.');
    }

    // 2. Active Restriction / Strike Check
    const restriction = StrikeService.getUserRestriction(userId);
    if (restriction.isRestricted) {
      throw new Error(restriction.reason || 'Akses Stranger Chat Anda sedang dibatasi.');
    }

    // 3. Check for existing active session
    const active = this.getActiveSession(userId);
    if (active) {
      return {
        matched: true,
        sessionId: active.id,
        partnerAlias: 'Stranger',
        status: 'CONNECTED',
      };
    }

    // 4. Find matching candidate from stranger_chat_queue
    const candidate = db.prepare(`
      SELECT q.user_id, q.interests
      FROM stranger_chat_queue q
      WHERE q.user_id != ?
        AND q.user_id NOT IN (
          SELECT blocked_user_id FROM stranger_blocks WHERE user_id = ?
          UNION
          SELECT user_id FROM stranger_blocks WHERE blocked_user_id = ?
        )
        AND q.user_id NOT IN (
          SELECT skipped_user_id FROM stranger_skips
          WHERE user_id = ? AND datetime(created_at) > datetime('now', '-3 minutes')
        )
      ORDER BY q.entered_at ASC
      LIMIT 1
    `).get(userId, userId, userId, userId) as { user_id: string; interests: string } | undefined;

    if (candidate) {
      // Create active session
      const sessionId = uuidv4();
      const candidateId = candidate.user_id;

      // Remove both from queue
      db.prepare('DELETE FROM stranger_chat_queue WHERE user_id IN (?, ?)').run(userId, candidateId);

      // Create session
      db.prepare(`
        INSERT INTO stranger_sessions (
          id, user_a_id, user_b_id, status, session_type, started_at, created_at, updated_at
        ) VALUES (?, ?, ?, 'CONNECTED', 'TEXT', datetime('now'), datetime('now'), datetime('now'))
      `).run(sessionId, candidateId, userId);

      // Initialize empty ephemeral message buffer
      sessionMessageStore.set(sessionId, []);

      // Notify both participants via SignalBus
      SignalBus.emit(sessionId, candidateId, {
        type: 'MATCH_CONNECTED',
        sessionId,
        partnerAlias: 'Stranger',
      });
      SignalBus.emit(sessionId, userId, {
        type: 'MATCH_CONNECTED',
        sessionId,
        partnerAlias: 'Stranger',
      });

      return {
        matched: true,
        sessionId,
        partnerAlias: 'Stranger',
        status: 'CONNECTED',
      };
    }

    // No candidate immediately available -> add to queue
    db.prepare(`
      INSERT INTO stranger_chat_queue (user_id, status, interests, entered_at, updated_at)
      VALUES (?, 'QUEUED', ?, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        status = 'QUEUED',
        interests = excluded.interests,
        entered_at = datetime('now'),
        updated_at = datetime('now')
    `).run(userId, JSON.stringify(interests));

    return {
      matched: false,
      status: 'QUEUED',
    };
  }

  /**
   * Leave matchmaking queue
   */
  public static leaveQueue(userId: string): { success: boolean } {
    const db = getDatabase();
    db.prepare('DELETE FROM stranger_chat_queue WHERE user_id = ?').run(userId);
    return { success: true };
  }

  /**
   * Get active text chat session for a user
   */
  public static getActiveSession(userId: string): any | null {
    const db = getDatabase();
    return db.prepare(`
      SELECT * FROM stranger_sessions
      WHERE (user_a_id = ? OR user_b_id = ?)
        AND session_type = 'TEXT'
        AND status = 'CONNECTED'
      LIMIT 1
    `).get(userId, userId) || null;
  }

  /**
   * Send text message through the server-side safety moderation pipeline
   */
  public static sendMessage(
    sessionId: string,
    senderId: string,
    rawContent: string
  ): {
    success: boolean;
    messageId: string;
    deliveredContent: string;
    isRedacted: boolean;
    moderationResult: ContentModerationResult;
    enforcementNotice?: string;
  } {
    const db = getDatabase();

    // 1. Validate Session & Sender Authorization
    const session = db.prepare(`
      SELECT id, user_a_id, user_b_id, status
      FROM stranger_sessions
      WHERE id = ?
    `).get(sessionId) as any;

    if (!session) {
      throw new Error('Sesi obrolan tidak ditemukan.');
    }

    if (session.status !== 'CONNECTED') {
      throw new Error('Sesi obrolan sudah berakhir.');
    }

    if (session.user_a_id !== senderId && session.user_b_id !== senderId) {
      throw new Error('Anda tidak memiliki otorisasi untuk mengirim pesan dalam sesi ini.');
    }

    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      throw new Error('Pesan tidak boleh kosong.');
    }

    if (rawContent.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Pesan melebihi batas maksimal ${MAX_MESSAGE_LENGTH} karakter.`);
    }

    const recipientId = session.user_a_id === senderId ? session.user_b_id : session.user_a_id;

    // 2. Active Restriction Check
    const restriction = StrikeService.getUserRestriction(senderId);
    if (restriction.isRestricted) {
      throw new Error(restriction.reason || 'Akun Anda sedang dibatasi.');
    }

    // 3. Anti-Spam Rate Limiting (Messages per minute)
    const now = Date.now();
    const userTimestamps = userMessageRateMap.get(senderId) || [];
    const recentTimestamps = userTimestamps.filter((t) => now - t < 60000);

    if (recentTimestamps.length >= MAX_MESSAGES_PER_MINUTE) {
      // Record SPAM_FLOODING moderation event
      StrikeService.recordViolation({
        userId: senderId,
        sessionId,
        category: 'SPAM_FLOODING',
        severity: 'MEDIUM',
        action: 'TEMP_RESTRICT',
        riskScore: 75,
        evidenceSnippet: 'Message rate limit exceeded (>15 msgs/min)',
      });
      throw new Error('Anda mengirim pesan terlalu cepat. Harap tunggu beberapa saat.');
    }

    recentTimestamps.push(now);
    userMessageRateMap.set(senderId, recentTimestamps);

    // 4. Anti-Spam: Duplicate Flooding Check
    const lastMsg = userLastMessageMap.get(senderId);
    if (lastMsg && lastMsg.content === rawContent.trim() && now - lastMsg.timestamp < 3000) {
      throw new Error('Pesan duplikat terdeteksi. Jangan mengirim pesan yang sama berulang-ulang.');
    }
    userLastMessageMap.set(senderId, { content: rawContent.trim(), timestamp: now });

    // 5. SERVER-SIDE SAFETY PIPELINE EVALUATION
    const messageId = uuidv4();
    const moderation = ContentModerationPipeline.evaluate(rawContent, sessionId, senderId);

    let enforcementNotice: string | undefined;

    // 6. Violation & Strike Escalation Handling
    if (moderation.strikeEscalation || moderation.action !== 'ALLOW') {
      const recorded = StrikeService.recordViolation({
        userId: senderId,
        sessionId,
        messageId,
        category: moderation.category || 'OTHER',
        severity: moderation.severity,
        action: moderation.action,
        riskScore: moderation.riskScore,
        evidenceSnippet: rawContent.substring(0, 75),
        immediateCritical: moderation.immediateActionRequired,
      });
      enforcementNotice = recorded.enforcementNotice;

      // If critical violation or strike 3 resulted in account block / session termination:
      if (recorded.restrictionApplied === 'BANNED' || moderation.immediateActionRequired) {
        this.terminateSession(sessionId, 'CRITICAL_MODERATION_ENFORCEMENT');
        // Notify both via SignalBus
        SignalBus.emit(sessionId, senderId, {
          type: 'SESSION_TERMINATED',
          reason: 'Akun Anda diblokir karena pelanggaran keamanan berat.',
        });
        SignalBus.emit(sessionId, recipientId, {
          type: 'SESSION_TERMINATED',
          reason: 'Obrolan dihentikan oleh sistem keamanan NIVA karena pelanggaran partner.',
        });

        return {
          success: false,
          messageId,
          deliveredContent: '',
          isRedacted: true,
          moderationResult: moderation,
          enforcementNotice,
        };
      }
    }

    // 7. Policy Enforcement for Recipient Content
    let contentForRecipient = rawContent;
    let isRedacted = false;

    if (moderation.action === 'BLOCK_MESSAGE') {
      // Message is blocked entirely, do not deliver to recipient
      return {
        success: false,
        messageId,
        deliveredContent: '',
        isRedacted: true,
        moderationResult: moderation,
        enforcementNotice: moderation.warningMessage || 'Pesan Anda diblokir oleh sistem keamanan NIVA.',
      };
    } else if (moderation.action === 'REDACT') {
      // Recipient gets clean standard redaction notice
      contentForRecipient = REDACTED_MESSAGE_NOTICE;
      isRedacted = true;
    }

    // 8. Ephemeral Message Dispatch
    const timestamp = new Date().toISOString();
    const outgoingMessage: StrangerChatMessage = {
      id: messageId,
      sessionId,
      senderId,
      content: contentForRecipient,
      isRedacted,
      timestamp,
      systemWarning: moderation.action === 'WARN' ? moderation.warningMessage : undefined,
    };

    // Store in ephemeral memory buffer
    let buffer = sessionMessageStore.get(sessionId);
    if (!buffer) {
      buffer = [];
      sessionMessageStore.set(sessionId, buffer);
    }
    buffer.push(outgoingMessage);
    if (buffer.length > MAX_SESSION_MESSAGES) {
      buffer.shift();
    }

    // Instant real-time push to recipient via SignalBus
    SignalBus.emit(sessionId, recipientId, {
      type: 'CHAT_MESSAGE',
      message: outgoingMessage,
    });

    return {
      success: true,
      messageId,
      deliveredContent: contentForRecipient,
      isRedacted,
      moderationResult: moderation,
      enforcementNotice,
    };
  }

  /**
   * Fetch ephemeral messages for an active session
   */
  public static getMessages(
    sessionId: string,
    userId: string,
    afterTimestamp?: string
  ): StrangerChatMessage[] {
    const db = getDatabase();

    // Verify participant authorization
    const session = db.prepare(`
      SELECT user_a_id, user_b_id, status FROM stranger_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!session || (session.user_a_id !== userId && session.user_b_id !== userId)) {
      throw new Error('Tidak memiliki otorisasi untuk membaca pesan sesi ini.');
    }

    const messages = sessionMessageStore.get(sessionId) || [];
    if (!afterTimestamp) {
      return messages;
    }

    const afterTime = new Date(afterTimestamp).getTime();
    return messages.filter((m) => new Date(m.timestamp).getTime() > afterTime);
  }

  /**
   * Skip partner and optionally find next match
   */
  public static skip(
    sessionId: string,
    userId: string
  ): { success: boolean; message: string } {
    const db = getDatabase();

    const session = db.prepare(`
      SELECT user_a_id, user_b_id, status FROM stranger_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!session) {
      throw new Error('Sesi tidak ditemukan.');
    }

    const partnerId = session.user_a_id === userId ? session.user_b_id : session.user_a_id;

    // Record skip to prevent immediate re-match
    db.prepare(`
      INSERT INTO stranger_skips (user_id, skipped_user_id, created_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(user_id, skipped_user_id) DO UPDATE SET created_at = datetime('now')
    `).run(userId, partnerId);

    // End session
    this.terminateSession(sessionId, `SKIPPED_BY_${userId}`);

    // Notify partner
    SignalBus.emit(sessionId, partnerId, {
      type: 'PARTNER_SKIPPED',
      sessionId,
    });

    return { success: true, message: 'Partner dilewati.' };
  }

  /**
   * Block partner permanently
   */
  public static block(
    sessionId: string,
    userId: string,
    reason?: string
  ): { success: boolean; message: string } {
    const db = getDatabase();

    const session = db.prepare(`
      SELECT user_a_id, user_b_id, status FROM stranger_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!session) {
      throw new Error('Sesi tidak ditemukan.');
    }

    const partnerId = session.user_a_id === userId ? session.user_b_id : session.user_a_id;

    // Insert into stranger_blocks
    db.prepare(`
      INSERT OR IGNORE INTO stranger_blocks (id, user_id, blocked_user_id, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(uuidv4(), userId, partnerId);

    // Terminate session
    this.terminateSession(sessionId, `BLOCKED_BY_${userId}`);

    // Notify partner
    SignalBus.emit(sessionId, partnerId, {
      type: 'PARTNER_BLOCKED',
      sessionId,
    });

    return { success: true, message: 'Partner berhasil diblokir secara permanen.' };
  }

  /**
   * Report partner with category and optional details
   */
  public static report(
    sessionId: string,
    reporterId: string,
    category: ModerationCategory,
    details?: string
  ): { success: boolean; reportId: string; message: string } {
    const db = getDatabase();

    const session = db.prepare(`
      SELECT user_a_id, user_b_id, status FROM stranger_sessions WHERE id = ?
    `).get(sessionId) as any;

    if (!session) {
      throw new Error('Sesi tidak ditemukan.');
    }

    const reportedUserId = session.user_a_id === reporterId ? session.user_b_id : session.user_a_id;

    // 1. Record report
    const reportId = uuidv4();
    db.prepare(`
      INSERT INTO stranger_reports (id, session_id, reporter_id, reported_user_id, reason, details, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'PENDING', datetime('now'))
    `).run(reportId, sessionId, reporterId, reportedUserId, category, details || null);

    // 2. Auto-block reported user for reporter's safety
    db.prepare(`
      INSERT OR IGNORE INTO stranger_blocks (id, user_id, blocked_user_id, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(uuidv4(), reporterId, reportedUserId);

    // 3. Record moderation event for reported user
    StrikeService.recordViolation({
      userId: reportedUserId,
      sessionId,
      category,
      severity: category === 'DANGEROUS_CONTENT' ? 'CRITICAL' : 'HIGH',
      action: 'BLOCK_SESSION',
      riskScore: 85,
      evidenceSnippet: `Reported by partner: ${category} - ${details || 'No details'}`,
    });

    // 4. Terminate session
    this.terminateSession(sessionId, `REPORTED_${category}_BY_${reporterId}`);

    // 5. Notify partner
    SignalBus.emit(sessionId, reportedUserId, {
      type: 'SESSION_TERMINATED',
      reason: 'Sesi dihentikan karena laporan keamanan.',
    });

    // 6. Notify Telegram Ops Channel
    try {
      NotifyService.notifyReportCreated({
        reportId,
        reporterId,
        reportedUserId,
        reason: category,
        details,
        sessionId,
      });
    } catch (notifyErr) {
      console.warn('Report Telegram alert notice:', notifyErr);
    }

    return {
      success: true,
      reportId,
      message: 'Laporan telah diterima dan diteruskan ke tim keamanan NIVA. Sesi dihentikan.',
    };
  }

  /**
   * Terminate active session and clean up ephemeral data
   */
  public static terminateSession(sessionId: string, reason: string): void {
    const db = getDatabase();

    db.prepare(`
      UPDATE stranger_sessions
      SET status = 'ENDED', ended_at = datetime('now'), end_reason = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(reason, sessionId);

    // Data minimization: purge ephemeral in-memory messages immediately upon session end
    sessionMessageStore.delete(sessionId);
    ContentModerationPipeline.clearTemporalWindow(sessionId);
  }
}
