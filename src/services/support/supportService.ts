import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { ModerationService } from '../safety/moderationService';
import { NotifyService } from '../notification/notifyService';
import { config } from '../../config/index';

export interface SupportTicket {
  id: string;
  user_id: string;
  type: string;
  category: string;
  subject: string;
  status: 'OPEN' | 'IN_REVIEW' | 'WAITING' | 'IN_PROGRESS' | 'WAITING_FOR_USER' | 'WAITING_FOR_ADMIN' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  access_token?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  assigned_admin_id: string | null;
  internal_notes: string | null;
  environment?: string;
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

    // Trigger Admin Alert via NotifyNIVABot
    try {
      NotifyService.notifyNewTicket(
        created,
        'Tiket bantuan Premium dibuka oleh pengguna.'
      ).catch(() => {});
    } catch {}

    return { ticket: created, isNew: true };
  }

  /**
   * Create Unified Support Ticket (General, Safety, Technical, Verification, Advertising, etc.)
   */
  public static createUnifiedTicket(input: {
    category: string;
    subject: string;
    message: string;
    contactName?: string;
    contactEmail?: string;
    userId?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    environment?: 'PRODUCTION' | 'TEST';
  }): { ticket: SupportTicket; accessToken: string; initialMessage: SupportMessage } {
    const db = getDatabase();
    const env = input.environment || 'PRODUCTION';

    const validCategories = [
      'GENERAL', 'TECHNICAL', 'SAFETY_REPORT', 'ACCOUNT', 'PRIVACY', 
      'DATA_DELETION', 'STUDENT_VERIFICATION', 'COMMUNITY', 'ADVERTISING', 
      'PARTNERSHIP', 'PAYMENT', 'PREMIUM', 'OTHER'
    ];

    const category = validCategories.includes(input.category) ? input.category : 'GENERAL';
    const subject = (input.subject || '').trim();
    const message = (input.message || '').trim();

    if (!subject || subject.length < 3) {
      throw new Error('INVALID_SUBJECT: Judul tiket minimal 3 karakter.');
    }
    if (!message || message.length < 5) {
      throw new Error('INVALID_MESSAGE: Isi pesan tiket minimal 5 karakter.');
    }

    let finalUserId = input.userId;
    let contactName = (input.contactName || '').trim();
    let contactEmail = (input.contactEmail || '').trim();

    if (!finalUserId) {
      // Create guest user record to satisfy foreign key integrity
      finalUserId = `anon_sup_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
      db.prepare(`
        INSERT INTO users (id, telegram_id, status, verification_status, is_18_plus, created_at, updated_at)
        VALUES (?, ?, 'ACTIVE', 'UNVERIFIED', 1, datetime('now'), datetime('now'))
      `).run(finalUserId, finalUserId);
    }

    contactName = contactName || 'Pengguna NIVA';

    // Auto-determine priority: SAFETY_REPORT defaults to HIGH
    let priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = input.priority || 'NORMAL';
    if (category === 'SAFETY_REPORT' && priority === 'NORMAL') {
      priority = 'HIGH';
    }

    // Generate random non-enumerable Ticket ID e.g. NIVA-849201
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const ticketId = `NIVA-${randomCode}`;

    // Generate 64-char crypto access token for IDOR protection
    const accessToken = crypto.randomBytes(32).toString('hex');

    db.prepare(`
      INSERT INTO support_tickets (
        id, user_id, type, category, subject, status, priority, 
        access_token, contact_name, contact_email, environment, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      ticketId, 
      finalUserId, 
      category === 'PREMIUM' ? 'PREMIUM' : 'GENERAL', 
      category, 
      subject, 
      priority, 
      accessToken, 
      contactName, 
      contactEmail || null, 
      env
    );

    // Initial message from user
    const msgId = uuidv4();
    db.prepare(`
      INSERT INTO support_messages (id, ticket_id, sender_type, sender_id, sender_name, body, is_internal, created_at)
      VALUES (?, ?, 'USER', ?, ?, ?, 0, datetime('now'))
    `).run(msgId, ticketId, finalUserId, contactName, message);

    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as unknown as SupportTicket;
    const initialMessage = db.prepare('SELECT * FROM support_messages WHERE id = ?').get(msgId) as unknown as SupportMessage;

    // Trigger Admin Alert via NotifyNIVABot
    try {
      NotifyService.notifyNewTicket(
        ticket,
        `[${category}] ${subject} (Prioritas: ${priority})`
      ).catch(() => {});
    } catch {}

    return { ticket, accessToken, initialMessage };
  }

  /**
   * Retrieve ticket details using access token (IDOR safe for web users)
   */
  public static getTicketByToken(ticketId: string, accessToken: string): {
    ticket: SupportTicket;
    messages: SupportMessage[];
    queuePosition: number;
  } {
    const db = getDatabase();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;

    if (!ticket) {
      throw new Error('TICKET_NOT_FOUND: Tiket bantuan tidak ditemukan.');
    }

    if (!ticket.access_token || ticket.access_token !== accessToken) {
      throw new Error('UNAUTHORIZED_ACCESS: Token akses tiket tidak valid atau tidak sesuai.');
    }

    const messages = db.prepare(`
      SELECT * FROM support_messages 
      WHERE ticket_id = ? AND is_internal = 0
      ORDER BY created_at ASC
    `).all(ticketId) as unknown as SupportMessage[];

    const queuePosition = this.getQueuePosition(ticketId);

    return { ticket, messages, queuePosition };
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

      // Alert admin operations bot
      try {
        NotifyService.notifyTicketUserReply(ticketId, ticket.user_id, cleanBody).catch(() => {});
      } catch {}
    } else if (senderType === 'ADMIN' && !isInternal) {
      db.prepare(`
        UPDATE support_tickets 
        SET status = 'WAITING_FOR_USER', assigned_admin_id = ?, updated_at = datetime('now')
        WHERE id = ? AND status != 'CLOSED'
      `).run(senderId, ticketId);

      // Real notification to user via main bot
      try {
        NotifyService.notifyUserTicketReply(ticket.user_id, ticketId, senderName, cleanBody).catch(() => {});
      } catch {}
    }

    return db.prepare('SELECT * FROM support_messages WHERE id = ?').get(msgId) as unknown as SupportMessage;
  }

  /**
   * Post message to support conversation using access token (Web user)
   */
  public static sendMessageWithToken(
    ticketId: string,
    accessToken: string,
    senderName: string,
    body: string
  ): SupportMessage {
    const db = getDatabase();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;
    if (!ticket) throw new Error('TICKET_NOT_FOUND: Tiket tidak ditemukan.');
    if (!ticket.access_token || ticket.access_token !== accessToken) {
      throw new Error('UNAUTHORIZED_ACCESS: Token akses tidak valid.');
    }

    return this.sendMessage(
      ticketId,
      'USER',
      ticket.user_id,
      senderName || ticket.contact_name || 'Pengguna NIVA',
      body,
      false
    );
  }

  /**
   * FIFO Support Queue for Admin (Section 16 & 17: Oldest eligible ticket first with Security Prioritization)
   */
  public static getSupportQueue(statusFilter?: string, categoryFilter?: string, searchQuery?: string): any[] {
    const db = getDatabase();
    let query = `
      SELECT 
        st.id as ticket_id,
        st.user_id,
        st.type,
        st.category,
        st.subject,
        st.status,
        st.priority,
        st.contact_name,
        st.contact_email,
        st.assigned_admin_id,
        st.created_at,
        st.updated_at,
        coalesce(p.display_name, st.contact_name, 'Pengguna NIVA') as display_name,
        i.short_name as institution_short_name,
        u.verification_status,
        u.subscription_status,
        (SELECT body FROM support_messages WHERE ticket_id = st.id AND is_internal = 0 ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM support_messages WHERE ticket_id = st.id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM support_messages WHERE ticket_id = st.id) as message_count,
        (SELECT created_at FROM support_messages WHERE ticket_id = st.id AND sender_type = 'ADMIN' ORDER BY created_at DESC LIMIT 1) as last_admin_response_at
      FROM support_tickets st
      JOIN users u ON u.id = st.user_id
      LEFT JOIN profiles p ON p.user_id = st.user_id
      LEFT JOIN institutions i ON i.id = p.institution_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (statusFilter && statusFilter !== 'ALL') {
      if (statusFilter === 'WAITING_USER' || statusFilter === 'WAITING_FOR_USER') {
        query += ` AND st.status IN ('WAITING', 'WAITING_FOR_USER') `;
      } else {
        query += ` AND st.status = ? `;
        params.push(statusFilter);
      }
    }

    if (categoryFilter && categoryFilter !== 'ALL') {
      query += ` AND st.category = ? `;
      params.push(categoryFilter);
    }

    if (searchQuery && searchQuery.trim()) {
      const q = `%${searchQuery.trim()}%`;
      query += ` AND (st.id LIKE ? OR st.subject LIKE ? OR st.contact_name LIKE ? OR p.display_name LIKE ?) `;
      params.push(q, q, q, q);
    }

    // Strict FIFO ordering with security/urgent elevation (Requirement 6: FIFO + Security Priority)
    query += ` ORDER BY (CASE WHEN st.priority = 'URGENT' THEN 0 WHEN st.category = 'SAFETY_REPORT' THEN 1 ELSE 2 END) ASC, st.created_at ASC `;

    return db.prepare(query).all(...params);
  }

  /**
   * Update ticket status (Admin action)
   */
  public static updateTicketStatus(
    ticketId: string,
    newStatus: string,
    adminId: string,
    notes?: string
  ): void {
    const db = getDatabase();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;
    if (!ticket) throw new Error('TICKET_NOT_FOUND: Tiket tidak ditemukan.');

    const closedAt = (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE support_tickets 
      SET status = ?, assigned_admin_id = coalesce(?, assigned_admin_id), internal_notes = coalesce(?, internal_notes), closed_at = ?, updated_at = datetime('now')
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

    // Telegram status change notifications
    if (newStatus === 'IN_PROGRESS') {
      NotifyService.sendUserMessage(
        ticket.user_id,
        `⏳ *Tiket ${ticketId}:* Admin NIVA sedang meninjau tiket bantuan Anda.`
      ).catch(() => {});
    } else if (newStatus === 'RESOLVED') {
      NotifyService.notifyUserTicketResolved(ticket.user_id, ticketId).catch(() => {});
    }
  }

  /**
   * Update ticket priority (Admin action)
   */
  public static updateTicketPriority(
    ticketId: string,
    newPriority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    adminId: string
  ): void {
    const db = getDatabase();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;
    if (!ticket) throw new Error('TICKET_NOT_FOUND: Tiket tidak ditemukan.');

    db.prepare(`
      UPDATE support_tickets 
      SET priority = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newPriority, ticketId);

    ModerationService.logAudit({
      actorId: adminId,
      actorRole: 'SUPPORT_ADMIN',
      action: 'SUPPORT_PRIORITY_CHANGED',
      targetResource: 'support_tickets',
      targetId: ticketId,
      details: `Changed priority of ticket ${ticketId} from ${ticket.priority} to ${newPriority}`,
    });
  }

  /**
   * Assign ticket to admin
   */
  public static assignTicket(
    ticketId: string,
    targetAdminId: string,
    actorAdminId: string
  ): void {
    const db = getDatabase();
    const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as SupportTicket | undefined;
    if (!ticket) throw new Error('TICKET_NOT_FOUND: Tiket tidak ditemukan.');

    db.prepare(`
      UPDATE support_tickets 
      SET assigned_admin_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(targetAdminId, ticketId);

    ModerationService.logAudit({
      actorId: actorAdminId,
      actorRole: 'SUPPORT_ADMIN',
      action: 'SUPPORT_TICKET_ASSIGNED',
      targetResource: 'support_tickets',
      targetId: ticketId,
      details: `Ticket ${ticketId} assigned to admin ${targetAdminId}`,
    });
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
