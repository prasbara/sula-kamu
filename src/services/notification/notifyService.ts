import { config } from '../../config/index';
import { getDatabase } from '../../database/db';

export interface NewUserJoinedData {
  userId: string;
  name?: string;
  institutionName?: string;
  verificationLevel?: string;
  totalStudentsJoined?: number;
  joinedAt?: string;
  source?: string;
  onboardingStatus?: string;
  is18Plus?: boolean;
  semarangEligible?: boolean;
  sourcePlatform?: string;
}

export class NotifyService {
  private static adminBotToken = config.NOTIFY_NIVA_BOT_TOKEN;
  private static userBotToken = config.TELEGRAM_BOT_TOKEN;
  private static adminChatId = config.NOTIFY_NIVA_CHAT_ID;

  // ── 1. Admin Notifications (NIVANotify @notifynivabot) ─────────────────────

  /**
   * Send notification to NotifyNIVABot for new registered/onboarded user.
   */
  public static async notifyNewUser(data: NewUserJoinedData): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.adminBotToken) return;

    const chatId = this.getAdminChatId();
    if (!chatId) {
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      this.recordNotificationEvent(eventId, 'NEW_USER', data.userId, 'FAILED', 'ADMIN_CHAT_ID_NOT_CONFIGURED');
      return;
    }

    const message = [
      '🆕 *NEW NIVA USER*',
      '',
      `👤 *Nama:* ${this.escapeMarkdown(data.name || 'Anonymous')}`,
      data.institutionName ? `🎓 *Institusi:* ${this.escapeMarkdown(data.institutionName)}` : '🎓 *Institusi:* Semarang Resident / Umum',
      `🆔 *User ID:* \`${this.escapeMarkdown(data.userId)}\``,
      `✅ *Verification:* ${this.escapeMarkdown(data.verificationLevel || 'UNVERIFIED')}`,
      `📅 *Waktu:* ${data.joinedAt || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      `🌐 *Source:* ${this.escapeMarkdown(data.source || 'Web Platform')}`,
    ].join('\n');

    const adminUrl = `${config.APP_URL}/app-admin/users/${encodeURIComponent(data.userId)}`;
    const keyboard = {
      inline_keyboard: [
        [{ text: '👤 Lihat User di Admin Panel', url: adminUrl }]
      ]
    };

    await this.sendTelegramMessage(this.adminBotToken, chatId, message, keyboard, 'NEW_USER', data.userId);
  }

  /**
   * Send notification to NotifyNIVABot when a user creates a new support ticket.
   */
  public static async notifyNewTicket(
    ticket: { id: string; user_id: string; type: string; subject: string; created_at?: string },
    messageBody: string,
    userDisplayName?: string
  ): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.adminBotToken) return;

    const chatId = this.getAdminChatId();
    if (!chatId) return;

    const message = [
      '🎫 *NEW PREMIUM SUPPORT TICKET*',
      '',
      `🏷 *Ticket:* \`${this.escapeMarkdown(ticket.id)}\``,
      `📁 *Kategori:* ${this.escapeMarkdown(ticket.type || 'PREMIUM')}`,
      `👤 *User:* ${this.escapeMarkdown(userDisplayName || ticket.user_id)}`,
      `🆔 *User ID:* \`${this.escapeMarkdown(ticket.user_id)}\``,
      `📅 *Dibuat:* ${ticket.created_at || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      '',
      '💬 *Pesan Pengguna:*',
      `"${this.escapeMarkdown(messageBody)}"`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '👤 Claim Tiket', callback_data: `adm_ticket:CLAIM:${ticket.id}` },
          { text: '💬 Balas via Panel', url: `${config.APP_URL}/app-admin/support` },
        ],
        [
          { text: '✅ Selesaikan (Resolve)', callback_data: `adm_ticket:RESOLVE:${ticket.id}` },
          { text: '🔒 Tutup Tiket', callback_data: `adm_ticket:CLOSE:${ticket.id}` },
        ]
      ]
    };

    await this.sendTelegramMessage(this.adminBotToken, chatId, message, keyboard, 'PREMIUM_TICKET_CREATED', ticket.user_id);
  }

  /**
   * Send notification to NotifyNIVABot when user replies to an ongoing support ticket.
   */
  public static async notifyTicketUserReply(
    ticketId: string,
    userId: string,
    messageBody: string
  ): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.adminBotToken) return;

    const chatId = this.getAdminChatId();
    if (!chatId) return;

    const message = [
      '💬 *BALASAN PENGGUNA PADA TIKET*',
      '',
      `🏷 *Ticket:* \`${this.escapeMarkdown(ticketId)}\``,
      `🆔 *User ID:* \`${this.escapeMarkdown(userId)}\``,
      '',
      '📝 *Pesan Baru:*',
      `"${this.escapeMarkdown(messageBody)}"`,
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '💬 Buka di Admin Panel', url: `${config.APP_URL}/app-admin/support` },
          { text: '✅ Selesaikan', callback_data: `adm_ticket:RESOLVE:${ticketId}` }
        ]
      ]
    };

    await this.sendTelegramMessage(this.adminBotToken, chatId, message, keyboard, 'PREMIUM_TICKET_REPLY', userId);
  }

  /**
   * Send payment event notification to NotifyNIVABot
   */
  public static async notifyPaymentEvent(
    eventType: 'NEW_PAYMENT' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED',
    details: {
      paymentId: string;
      userId: string;
      planName: string;
      amount: number;
      notes?: string;
    }
  ): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.adminBotToken) return;
    const chatId = this.getAdminChatId();
    if (!chatId) return;

    let title = '💳 *NIVA PAYMENT EVENT*';
    if (eventType === 'NEW_PAYMENT') title = '💳 *BUKTI PEMBAYARAN MASUK (QRIS)*';
    if (eventType === 'PAYMENT_APPROVED') title = '✅ *PEMBAYARAN DISETUJUI*';
    if (eventType === 'PAYMENT_REJECTED') title = '⚠️ *PEMBAYARAN DITOLAK*';

    const message = [
      title,
      '',
      `🧾 *Invoice:* \`${this.escapeMarkdown(details.paymentId)}\``,
      `🆔 *User ID:* \`${this.escapeMarkdown(details.userId)}\``,
      `📦 *Paket:* ${this.escapeMarkdown(details.planName)}`,
      `💰 *Total:* Rp${details.amount.toLocaleString('id-ID')}`,
      details.notes ? `📝 *Catatan:* ${this.escapeMarkdown(details.notes)}` : '',
    ].filter(Boolean).join('\n');

    let keyboard: any = undefined;
    if (eventType === 'NEW_PAYMENT') {
      keyboard = {
        inline_keyboard: [
          [
            { text: '✅ Setujui (Approve)', callback_data: `adm_pay:APPROVE:${details.paymentId}` },
            { text: '❌ Tolak (Reject)', callback_data: `adm_pay:REJECT:${details.paymentId}` }
          ],
          [
            { text: '🔍 Buka di Admin Panel', url: `${config.APP_URL}/app-admin/payments` }
          ]
        ]
      };
    }

    await this.sendTelegramMessage(this.adminBotToken, chatId, message, keyboard, eventType, details.userId);
  }

  /**
   * Send safety violation/report alert to NotifyNIVABot
   */
  public static async notifyReportCreated(details: {
    reportId: string;
    reporterId: string;
    reportedUserId: string;
    reason: string;
    details?: string;
    sessionId?: string;
  }): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.adminBotToken) return;
    const chatId = this.getAdminChatId();
    if (!chatId) return;

    const message = [
      '🚨 *CRITICAL SAFETY ALERT / REPORT*',
      '',
      `🆔 *Report ID:* \`${this.escapeMarkdown(details.reportId)}\``,
      details.sessionId ? `📹 *Session ID:* \`${this.escapeMarkdown(details.sessionId)}\`` : '',
      `⚠️ *Kategori Pelanggaran:* *${this.escapeMarkdown(details.reason)}*`,
      `👤 *Pelapor:* \`${this.escapeMarkdown(details.reporterId)}\``,
      `🚫 *Terlapor:* \`${this.escapeMarkdown(details.reportedUserId)}\``,
      details.details ? `📝 *Keterangan:* ${this.escapeMarkdown(details.details)}` : '',
      `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    ].filter(Boolean).join('\n');

    const keyboard = {
      inline_keyboard: [
        [{ text: '🛡 Tangani di Admin Panel', url: `${config.APP_URL}/app-admin/stranger-cam` }]
      ]
    };

    await this.sendTelegramMessage(this.adminBotToken, chatId, message, keyboard, 'REPORT_CREATED', details.reportedUserId);
  }

  /**
   * Send operational system alert to NotifyNIVABot
   */
  public static async notifySystemAlert(
    title: string,
    description: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.adminBotToken) return;
    const chatId = this.getAdminChatId();
    if (!chatId) return;

    const icon = severity === 'CRITICAL' ? '🔥' : severity === 'HIGH' ? '⚠️' : 'ℹ️';
    const message = [
      `${icon} *SYSTEM ALERT (${severity})*`,
      '',
      `📢 *${this.escapeMarkdown(title)}*`,
      '',
      this.escapeMarkdown(description),
      '',
      `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
    ].join('\n');

    await this.sendTelegramMessage(this.adminBotToken, chatId, message, undefined, 'SYSTEM_ALERT', 'system');
  }

  /**
   * Send security strike or critical restriction alert to NotifyNIVABot
   */
  public static async notifyModerationAlert(text: string): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.adminBotToken) return;
    const chatId = this.getAdminChatId();
    if (!chatId) return;

    await this.sendTelegramMessage(
      this.adminBotToken,
      chatId,
      text,
      {
        inline_keyboard: [
          [{ text: '🛡 Buka Antrean Moderasi', url: `${config.APP_URL}/app-admin/moderation` }]
        ]
      },
      'MODERATION_ALERT',
      'moderation_engine'
    );
  }

  // ── 2. User Outbound Notifications (NIVASocial @nivasocialmakingbot) ───────

  /**
   * Send arbitrary message to linked Telegram user
   */
  public static async sendUserMessage(userId: string, text: string): Promise<void> {
    if (!this.userBotToken) return;
    const userTelegramId = this.getUserTelegramId(userId);
    if (!userTelegramId) return;
    await this.sendTelegramMessage(this.userBotToken, userTelegramId, text, undefined, 'USER_DIRECT_MESSAGE', userId);
  }

  /**
   * Broadcast match event to admin bot and participating linked users
   */
  public static async notifyMatchCreated(details: {
    sessionId: string;
    userAId: string;
    userBId: string;
  }): Promise<void> {
    if (config.NOTIFY_NIVA_ENABLED && this.adminBotToken) {
      const chatId = this.getAdminChatId();
      if (chatId) {
        const message = [
          '🎉 *NEW STRANGER MATCH CREATED*',
          '',
          `🆔 *Session:* \`${this.escapeMarkdown(details.sessionId)}\``,
          `👤 *User A:* \`${this.escapeMarkdown(details.userAId)}\``,
          `👤 *User B:* \`${this.escapeMarkdown(details.userBId)}\``,
          `📅 *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
        ].join('\n');
        await this.sendTelegramMessage(this.adminBotToken, chatId, message, undefined, 'NEW_MATCH', details.sessionId);
      }
    }

    // Outbound user match alert if linked
    const db = getDatabase();
    const userA = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(details.userAId) as { telegram_id: string } | undefined;
    const userB = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(details.userBId) as { telegram_id: string } | undefined;

    if (userA?.telegram_id && !userA.telegram_id.startsWith('stranger_')) {
      await this.notifyUserMatch(details.userAId, 'Stranger Semarang', details.sessionId, true);
    }
    if (userB?.telegram_id && !userB.telegram_id.startsWith('stranger_')) {
      await this.notifyUserMatch(details.userBId, 'Stranger Semarang', details.sessionId, false);
    }
  }

  /**
   * Notify user about a matched stranger video session
   */
  public static async notifyUserMatch(
    userId: string,
    partnerName: string,
    sessionId: string,
    isInitiator: boolean
  ): Promise<void> {
    if (!this.userBotToken) return;
    const userTelegramId = this.getUserTelegramId(userId);
    if (!userTelegramId) return;

    const strangerCamUrl = `${config.APP_URL}/stranger-cam?session=${encodeURIComponent(sessionId)}`;
    const message = [
      '🎉 *STRANGER DITEMUKAN!*',
      '',
      `Halo! Anda telah dipasangkan dengan *${this.escapeMarkdown(partnerName || 'Stranger')}* di Semarang.`,
      '',
      `🆔 *Session ID:* \`${this.escapeMarkdown(sessionId)}\``,
      `🎭 *Peran Anda:* ${isInitiator ? 'Initiator (Penelepon)' : 'Receiver (Penerima)'}`,
      '',
      'Kamera kedua pengguna harus aktif di browser untuk memulai percakapan 1-on-1 (Zero Recording):',
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎥 BUKA STRANGER CAM SEKARANG', url: strangerCamUrl }],
        [
          { text: '⏭ Skip Partner', callback_data: `user_match:SKIP:${sessionId}` },
          { text: '⏹ Akhiri', callback_data: `user_match:END:${sessionId}` }
        ]
      ]
    };

    await this.sendTelegramMessage(this.userBotToken, userTelegramId, message, keyboard, 'NEW_MATCH', userId);
  }

  /**
   * Notify user when admin replies to their support ticket
   */
  public static async notifyUserTicketReply(
    userId: string,
    ticketId: string,
    adminName: string,
    replyText: string
  ): Promise<void> {
    if (!this.userBotToken) return;
    const userTelegramId = this.getUserTelegramId(userId);
    if (!userTelegramId) return;

    const message = [
      '💬 *BALASAN DARI ADMIN NIVA*',
      '',
      `Admin *${this.escapeMarkdown(adminName || 'Tim Support')}* telah membalas tiket bantuan Anda:`,
      `🏷 *Tiket:* \`${this.escapeMarkdown(ticketId)}\``,
      '',
      `"${this.escapeMarkdown(replyText)}"`,
      '',
      '_Ketik pesan balasan Anda langsung di chat bot ini untuk merespons tim admin._',
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [
          { text: '🎫 Lihat Tiket di Website', url: `${config.APP_URL}/premium/support` },
          { text: '✅ Selesai / Tutup', callback_data: `user_ticket:RESOLVE:${ticketId}` }
        ]
      ]
    };

    await this.sendTelegramMessage(this.userBotToken, userTelegramId, message, keyboard, 'PREMIUM_TICKET_REPLY', userId);
  }

  /**
   * Notify user when their ticket is resolved
   */
  public static async notifyUserTicketResolved(userId: string, ticketId: string): Promise<void> {
    if (!this.userBotToken) return;
    const userTelegramId = this.getUserTelegramId(userId);
    if (!userTelegramId) return;

    const message = [
      '✅ *TIKET BANTUAN DISELESAIKAN*',
      '',
      `Tiket Anda \`${this.escapeMarkdown(ticketId)}\` telah ditandai sebagai *RESOLVED* oleh admin NIVA.`,
      'Terima kasih telah menghubungi tim NIVA. Jika masih ada pertanyaan lain, silakan buka tiket baru.',
    ].join('\n');

    await this.sendTelegramMessage(this.userBotToken, userTelegramId, message, undefined, 'PREMIUM_TICKET_RESOLVED', userId);
  }

  /**
   * Notify user when premium subscription is activated
   */
  public static async notifyUserPremiumActivated(
    userId: string,
    planName: string,
    expiresAt?: string
  ): Promise<void> {
    if (!this.userBotToken) return;
    const userTelegramId = this.getUserTelegramId(userId);
    if (!userTelegramId) return;

    const message = [
      '💎 *PREMIUM TELAH AKTIF!*',
      '',
      'Selamat! Akun NIVA Anda kini telah berstatus *PREMIUM_ACTIVE*.',
      `📦 *Paket:* ${this.escapeMarkdown(planName)}`,
      expiresAt ? `📅 *Berlaku Sampai:* ${this.escapeMarkdown(expiresAt)}` : '📅 *Berlaku:* 30 Hari',
      '',
      'Nikmati kuota discovery penuh, prioritas matchmaking Semarang, dan lencana verifikasi mahasiswa!',
    ].join('\n');

    const keyboard = {
      inline_keyboard: [
        [{ text: '🎥 Buka Stranger Cam Sekarang', url: `${config.APP_URL}/stranger-cam` }]
      ]
    };

    await this.sendTelegramMessage(this.userBotToken, userTelegramId, message, keyboard, 'PREMIUM_STATUS_CHANGED', userId);
  }

  // ── 3. Internal Transport with Retry & Auditing ────────────────────────────

  private static async sendTelegramMessage(
    token: string,
    chatId: string,
    text: string,
    replyMarkup?: any,
    eventType = 'GENERIC',
    userId = 'unknown'
  ): Promise<void> {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.recordNotificationEvent(eventId, eventType, userId, 'PENDING');

    const maxRetries = 2;
    let lastError = '';

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          this.updateNotificationEventStatus(eventId, 'SENT');
          return;
        }

        const body = await res.text();
        lastError = `Status ${res.status}: ${body}`;
        console.warn(`[Telegram Notification] Attempt ${attempt + 1} failed: ${lastError}`);
        if (body.includes("can't parse entities") || body.includes("Bad Request")) {
          delete payload.parse_mode;
        }
      } catch (err: any) {
        lastError = err.message || 'Network error';
        console.warn(`[Telegram Notification] Attempt ${attempt + 1} error: ${lastError}`);
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }

    this.updateNotificationEventStatus(eventId, 'FAILED', lastError);
  }

  private static getAdminChatId(): string {
    if (this.adminChatId) return this.adminChatId;
    if (process.env.NOTIFY_NIVA_CHAT_ID) return process.env.NOTIFY_NIVA_CHAT_ID;
    if (process.env.TELEGRAM_ADMIN_CHAT_ID) return process.env.TELEGRAM_ADMIN_CHAT_ID;
    if (config.NOTIFY_NIVA_CHAT_ID) return config.NOTIFY_NIVA_CHAT_ID;
    try {
      const db = getDatabase();
      const row = db.prepare("SELECT value FROM system_settings WHERE key = 'admin_notify_chat_id'").get() as { value: string } | undefined;
      if (row && row.value) return row.value;
    } catch {}
    return '5764989848';
  }

  private static getUserTelegramId(userId: string): string | null {
    try {
      const db = getDatabase();
      const user = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(userId) as { telegram_id?: string } | undefined;
      if (user && user.telegram_id && !user.telegram_id.startsWith('anon_')) {
        return user.telegram_id;
      }
    } catch {}
    return null;
  }

  private static recordNotificationEvent(id: string, eventType: string, userId: string, status: string, error?: string): void {
    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO notification_events (id, event_type, user_id, status, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(id, eventType, userId, status, error || null);
    } catch {}
  }

  private static updateNotificationEventStatus(id: string, status: string, error?: string): void {
    try {
      const db = getDatabase();
      db.prepare(`
        UPDATE notification_events
        SET status = ?, error_message = coalesce(?, error_message)
        WHERE id = ?
      `).run(status, error || null, id);
    } catch {}
  }

  public static escapeMarkdown(text: string): string {
    return (text || '').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}
