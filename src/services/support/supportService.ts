import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { ModerationService } from '../safety/moderationService';
import { config } from '../../config/index';

export interface SupportTicket {
  id: string;
  user_id: string;
  type: string;
  subject: string;
  status: 'OPEN' | 'WAITING' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assigned_admin_id: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: 'USER' | 'ADMIN' | 'SYSTEM';
  sender_id: string;
  sender_name: string;
  body: string;
  is_internal: number;
  created_at: string;
}

export class SupportService {
  private static readonly BRIDGE_TOKEN_EXPIRY_MINUTES = 15;

  /**
   * Get or create a Premium support ticket for a user (Anti-duplication)
   */
  public static getOrCreatePremiumTicket(userId: string): { ticket: SupportTicket; isNew: boolean } {
    const db = getDatabase();

    // 1. Check if user already has an active open premium ticket
    const existing = db.prepare(`
      SELECT * FROM support_tickets 
      WHERE user_id = ? AND type = 'PREMIUM' AND status IN ('OPEN', 'WAITING', 'IN_PROGRESS', 'WAITING_FOR_USER')
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(userId) as SupportTicket | undefined;

    if (existing) {
      return { ticket: existing, isNew: false };
    }

    // 2. Generate clean standard ticket code e.g. NIVA-PREM-XXXXXX
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const ticketId = `NIVA-PREM-${randomSuffix}`;

    db.prepare(`
      INSERT INTO support_tickets (id, user_id, type, subject, status, priority, created_at, updated_at)
      VALUES (?, ?, 'PREMIUM', 'NIVA Premium Inquiry & Support', 'OPEN', 'NORMAL', datetime('now'), datetime('now'))
    `).run(ticketId, userId);

    // Initial greeting system message
    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, body, is_internal, created_at)
      VALUES (?, ?, 'SYSTEM', 'system', 'NIVA System', 'Tiket bantuan NIVA Premium Anda telah dibuka. Admin akan membalas pertanyaan atau membantu proses pembayaran sesuai antrean FIFO.', 0, datetime('now'))
    `).run(msgId, ticketId);

    const created = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as unknown as SupportTicket;
    return { ticket: created, isNew: true };
  }

  /**
   * Calculate exact FIFO queue position for a ticket (1-based index)
   */
  public static getQueuePosition(ticketId: string): number {
    const db = getDatabase();
    const ticket = db.prepare('SELECT created_at, status FROM support_tickets WHERE id = ?').get(ticketId) as
      | { created_at: string; status: string }
      | undefined;

    if (!ticket || ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return 0;
    }

    const row = db.prepare(`
      SELECT COUNT(*) as position 
      FROM support_tickets 
      WHERE status IN ('OPEN', 'WAITING', 'IN_PROGRESS') 
        AND created_at <= ?
    `).get(ticket.created_at) as { position: number };

    return Math.max(1, row.position);
  }

  /**
   * Create a single-use, cryptographically secure short-lived Telegram bridge token (15 mins)
   */
  public static createBridgeToken(userId: string, targetTicketId?: string, purpose = 'PREMIUM_SUPPORT'): string {
    const db = getDatabase();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.BRIDGE_TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO bridge_tokens (token_hash, user_id, purpose, target_ticket_id, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(tokenHash, userId, purpose, targetTicketId || null, expiresAt);

    return rawToken;
  }

  /**
   * Exchange single-use bridge token for authenticated user session data (Anti-Replay)
   */
  public static exchangeBridgeToken(rawToken: string): { userId: string; targetTicketId: string | null; purpose: string } {
    if (!rawToken || rawToken.length < 32) {
      throw new Error('INVALID_TOKEN: Token otentikasi tidak valid.');
    }

    const db = getDatabase();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const tokenRow = db.prepare(`
      SELECT * FROM bridge_tokens WHERE token_hash = ?
    `).get(tokenHash) as { token_hash: string; user_id: string; target_ticket_id: string | null; purpose: string; expires_at: string; used_at: string | null } | undefined;

    if (!tokenRow) {
      throw new Error('TOKEN_NOT_FOUND: Tautan tidak ditemukan atau tidak valid.');
    }

    if (tokenRow.used_at !== null) {
      throw new Error('TOKEN_ALREADY_USED: Tautan satu-kali-pakai telah digunakan sebelumnya demi keamanan.');
    }

    if (Date.now() > new Date(tokenRow.expires_at).getTime()) {
      throw new Error('TOKEN_EXPIRED: Tautan telah kedaluwarsa (berlaku 15 menit). Silakan minta tautan baru lewat Telegram.');
    }

    // Mark as used immediately to prevent replay attacks
    db.prepare("UPDATE bridge_tokens SET used_at = datetime('now') WHERE token_hash = ?").run(tokenHash);

    return {
      userId: tokenRow.user_id,
      targetTicketId: tokenRow.target_ticket_id,
      purpose: tokenRow.purpose,
    };
  }

  /**
   * Fetch ticket details, messages, and user context
   */
  public static getTicketDetails(ticketId: string, requestingUserId?: string, isAdmin = false): {
    ticket: SupportTicket;
    messages: SupportMessage[];
    queuePosition: number;
    userProfile?: any;
  } {
    const db = getDatabase();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;

    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND: Tiket bantuan tidak ditemukan.');
    }

    // User isolation check: normal users can ONLY access their own ticket
    if (!isAdmin && requestingUserId && ticket.user_id !== requestingUserId) {
      throw new Error('UNAUTHORIZED_ACCESS: Anda tidak memiliki akses ke tiket ini.');
    }

    // Fetch messages: users never see internal notes (is_internal = 0)
    let messagesQuery = `
      SELECT * FROM support_messages 
      WHERE ticket_id = ?
    `;
    if (!isAdmin) {
      messagesQuery += ' AND is_internal = 0';
    }
    messagesQuery += ' ORDER BY created_at ASC';

    const messages = db.prepare(messagesQuery).all(ticketId) as unknown as SupportMessage[];
    const queuePosition = this.getQueuePosition(ticketId);

    // Fetch user context
    const userProfile = db.prepare(`
      SELECT 
        u.id as user_id,
        u.verification_status,
        u.subscription_status,
        u.status as account_status,
        p.display_name,
        p.study_field,
        p.age,
        i.name as institution_name,
        i.short_name as institution_short_name
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN institutions i ON i.id = p.institution_id
      WHERE u.id = ?
    `).get(ticket.user_id);

    return { ticket, messages, queuePosition, userProfile };
  }

  /**
   * Safe user-facing ticket retrieval (enforces strict user isolation)
   */
  public static getUserTicketDetails(userId: string, ticketId: string) {
    return this.getTicketDetails(ticketId, userId, false);
  }

  /**
   * Admin-facing ticket retrieval (includes internal notes and admin actions)
   */
  public static getAdminTicketDetails(ticketId: string) {
    return this.getTicketDetails(ticketId, undefined, true);
  }

  /**
   * Post message to support conversation
   */
  public static sendMessage(
    ticketId: string,
    senderType: 'USER' | 'ADMIN',
    senderId: string,
    senderName: string,
    body: string,
    isInternal = false
  ): SupportMessage {
    const db = getDatabase();
    const cleanBody = body.trim();
    if (!cleanBody) throw new Error('EMPTY_MESSAGE: Isi pesan tidak boleh kosong.');
    if (cleanBody.length > 2000) throw new Error('MESSAGE_TOO_LONG: Pesan maksimal 2000 karakter.');

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;
    if (!ticket) throw new Error('TICKET_NOT_FOUND: Tiket tidak ditemukan.');

    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, body, is_internal, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(msgId, ticketId, senderType, senderId, senderName, cleanBody, isInternal ? 1 : 0);

    // Update ticket timestamps and status
    if (senderType === 'USER') {
      db.prepare(`
        UPDATE support_tickets 
        SET status = 'WAITING', updated_at = datetime('now')
        WHERE id = ? AND status != 'CLOSED'
      `).run(ticketId);
    } else if (senderType === 'ADMIN' && !isInternal) {
      db.prepare(`
        UPDATE support_tickets 
        SET status = 'WAITING_FOR_USER', assigned_admin_id = ?, updated_at = datetime('now')
        WHERE id = ? AND status != 'CLOSED'
      `).run(senderId, ticketId);

      // Section 23: Telegram notification for admin reply
      SupportService.sendTelegramNotification(
        ticket.user_id,
        '💬 *NIVA Admin has replied to your Premium support ticket.*\n\nSilakan cek pesan di website NIVA.'
      ).catch(() => {});
    }

    return db.prepare('SELECT * FROM support_messages WHERE id = ?').get(msgId) as unknown as SupportMessage;
  }

  /**
   * FIFO Support Queue for Admin (Section 16 & 17: Oldest eligible ticket first)
   */
  public static getSupportQueue(statusFilter?: string): any[] {
    const db = getDatabase();
    let query = `
      SELECT 
        st.id as ticket_id,
        st.user_id,
        st.type,
        st.subject,
        st.status,
        st.priority,
        st.assigned_admin_id,
        st.created_at,
        st.updated_at,
        p.display_name,
        i.short_name as institution_short_name,
        u.verification_status,
        u.subscription_status,
        (SELECT body FROM support_messages WHERE ticket_id = st.id AND is_internal = 0 ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM support_messages WHERE ticket_id = st.id ORDER BY created_at DESC LIMIT 1) as last_message_at
      FROM support_tickets st
      JOIN users u ON u.id = st.user_id
      LEFT JOIN profiles p ON p.user_id = st.user_id
      LEFT JOIN institutions i ON i.id = p.institution_id
    `;

    if (statusFilter && statusFilter !== 'ALL') {
      query += ` WHERE st.status = '${statusFilter}' `;
    } else {
      query += ` WHERE st.status != 'CLOSED' `;
    }

    // Strict FIFO: Oldest ticket first
    query += ` ORDER BY st.created_at ASC `;

    return db.prepare(query).all();
  }

  /**
   * Update ticket status (Admin action)
   */
  public static updateTicketStatus(
    ticketId: string,
    newStatus: 'OPEN' | 'WAITING' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'RESOLVED' | 'CLOSED',
    adminId: string,
    notes?: string
  ): void {
    const db = getDatabase();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;
    if (!ticket) throw new Error('TICKET_NOT_FOUND: Tiket tidak ditemukan.');

    const closedAt = (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE support_tickets 
      SET status = ?, assigned_admin_id = ?, internal_notes = coalesce(?, internal_notes), closed_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, adminId, notes || null, closedAt, ticketId);

    ModerationService.logAudit({
      actorId: adminId,
      actorRole: 'SUPPORT_ADMIN',
      action: 'SUPPORT_STATUS_CHANGED',
      targetResource: 'support_tickets',
      targetId: ticketId,
      details: `Changed support ticket ${ticketId} status from ${ticket.status} to ${newStatus}. Notes: ${notes || 'none'}`,
    });

    // Section 23: Telegram status change notifications
    if (newStatus === 'IN_PROGRESS') {
      SupportService.sendTelegramNotification(
        ticket.user_id,
        '⏳ *Admin NIVA sedang meninjau tiket bantuan Premium Anda.*'
      ).catch(() => {});
    } else if (newStatus === 'RESOLVED') {
      SupportService.sendTelegramNotification(
        ticket.user_id,
        '✅ *Tiket bantuan Premium NIVA Anda telah diselesaikan. Terima kasih!*'
      ).catch(() => {});
    }
  }

  /**
   * Send outbound Telegram notification safely to user
   */
  public static async sendTelegramNotification(userId: string, text: string): Promise<void> {
    try {
      if (!config.TELEGRAM_BOT_TOKEN) return;
      const db = getDatabase();
      const user = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(userId) as { telegram_id: string } | undefined;
      if (!user || !user.telegram_id) return;

      const url = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegram_id,
          text: text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.warn('Telegram notification failed:', err);
    }
  }
}
