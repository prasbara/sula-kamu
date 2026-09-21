import { config } from '../../config/index';
import { getDatabase } from '../../database/db';

export interface NewUserJoinedData {
  userId: string;
  name: string;
  institutionName: string;
  verificationLevel: string;
  totalStudentsJoined: number;
  joinedAt?: string;
}

export class NotifyService {
  private static token = config.NOTIFY_NIVA_BOT_TOKEN;
  private static chatId = config.NOTIFY_NIVA_CHAT_ID;

  /**
   * Send notification to NotifyNIVABot for new legitimate joined user
   * Non-blocking and failure-isolated
   */
  public static async notifyNewUser(data: NewUserJoinedData): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.token) {
      return;
    }

    const chatId = this.chatId || process.env.NOTIFY_NIVA_CHAT_ID;
    if (!chatId) {
      console.log(`[NotifyNIVABot] New user event created for ${data.userId}, but NOTIFY_NIVA_CHAT_ID is not configured.`);
      return;
    }

    const message = [
      '🆕 *NEW NIVA USER*',
      '',
      `👤 *Nama:* ${this.escapeMarkdown(data.name)}`,
      `🎓 *Institusi:* ${this.escapeMarkdown(data.institutionName)}`,
      `🆔 *NIVA User ID:* \`${this.escapeMarkdown(data.userId)}\``,
      `✅ *Verification:* ${this.escapeMarkdown(data.verificationLevel)}`,
      `📅 *Joined:* ${data.joinedAt || new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`,
      `📊 *Total Students Joined:* ${data.totalStudentsJoined}`,
      '📱 *Telegram:* Linked',
    ].join('\n');

    const adminUrl = `${config.APP_URL}/app-admin/users/${encodeURIComponent(data.userId)}`;
    const keyboard = {
      inline_keyboard: [
        [
          { text: '👤 Open User', url: adminUrl }
        ]
      ]
    };

    try {
      await this.sendTelegramMessage(chatId, message, keyboard);
      this.recordNotificationEvent('NEW_USER_REGISTERED', data.userId, 'SENT');
    } catch (err: any) {
      console.error('[NotifyNIVABot] Failed to deliver notification:', err.message);
      this.recordNotificationEvent('NEW_USER_REGISTERED', data.userId, 'FAILED', err.message);
    }
  }

  /**
   * Send payment notification to NotifyNIVABot
   */
  public static async notifyPaymentEvent(eventType: 'NEW_PAYMENT' | 'PAYMENT_APPROVED' | 'PAYMENT_REJECTED', details: {
    paymentId: string;
    userId: string;
    planName: string;
    amount: number;
    notes?: string;
  }): Promise<void> {
    if (!config.NOTIFY_NIVA_ENABLED || !this.token) return;
    const chatId = this.chatId || process.env.NOTIFY_NIVA_CHAT_ID;
    if (!chatId) return;

    let title = '💳 *NIVA PAYMENT EVENT*';
    if (eventType === 'NEW_PAYMENT') title = '💳 *BUKTI PEMBAYARAN MASUK*';
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

    try {
      await this.sendTelegramMessage(chatId, message);
    } catch (err: any) {
      console.error(`[NotifyNIVABot] Failed to send ${eventType}:`, err.message);
    }
  }

  private static async sendTelegramMessage(chatId: string, text: string, replyMarkup?: any): Promise<void> {
    const url = `https://api.telegram.org/bot${this.token}/sendMessage`;
    const payload: any = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Telegram API responded with ${res.status}: ${body}`);
    }
  }

  private static recordNotificationEvent(eventType: string, userId: string, status: string, error?: string): void {
    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO notification_events (id, event_type, user_id, status, error_message, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).run(`evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`, eventType, userId, status, error || null);
    } catch {
      // Best-effort auditing
    }
  }

  private static escapeMarkdown(text: string): string {
    return (text || '').replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }
}
