import crypto from 'node:crypto';
import { getDatabase } from '../../database/db';
import { config } from '../../config/index';

export interface LinkTokenResult {
  token: string;
  linkUrl: string;
  expiresAt: string;
}

export class TelegramService {
  private static readonly LINK_TOKEN_EXPIRY_MINUTES = 15;

  /**
   * Generate single-use cryptographic linking token for web user
   */
  public static createLinkToken(userId: string): LinkTokenResult {
    const db = getDatabase();

    // Verify user exists
    const user = db.prepare('SELECT id, status FROM users WHERE id = ?').get(userId) as { id: string; status: string } | undefined;
    if (!user) {
      throw new Error('USER_NOT_FOUND: Pengguna tidak ditemukan.');
    }

    // Clean up old expired tokens for this user
    try {
      db.prepare("DELETE FROM telegram_link_tokens WHERE user_id = ? AND expires_at < datetime('now')").run(userId);
    } catch {}

    const rawToken = crypto.randomBytes(24).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + this.LINK_TOKEN_EXPIRY_MINUTES * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO telegram_link_tokens (token_hash, user_id, expires_at, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(tokenHash, userId, expiresAt);

    const botUsername = (config.TELEGRAM_BOT_URL || 'https://t.me/nivasocialmakingbot').replace(/^.*\/+/, '');
    const linkUrl = `https://t.me/${botUsername}?start=link_${rawToken}`;

    return {
      token: rawToken,
      linkUrl,
      expiresAt,
    };
  }

  /**
   * Validate token and bind telegram_id to NIVA user account
   */
  public static verifyAndLinkToken(
    rawToken: string,
    telegramId: string
  ): { success: boolean; userId: string; message: string } {
    if (!rawToken || rawToken.length < 16) {
      return { success: false, userId: '', message: 'Token tidak valid.' };
    }

    const db = getDatabase();
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const row = db.prepare(`
      SELECT * FROM telegram_link_tokens WHERE token_hash = ?
    `).get(tokenHash) as { token_hash: string; user_id: string; expires_at: string; used_at: string | null } | undefined;

    if (!row) {
      return { success: false, userId: '', message: 'Tautan penghubung tidak ditemukan atau sudah kedaluwarsa.' };
    }

    if (row.used_at !== null) {
      return { success: false, userId: '', message: 'Tautan ini sudah pernah digunakan sebelumnya demi keamanan.' };
    }

    if (Date.now() > new Date(row.expires_at).getTime()) {
      return { success: false, userId: '', message: 'Tautan telah kedaluwarsa (berlaku 15 menit). Silakan buat tautan baru di website.' };
    }

    // Check if this telegram_id is already bound to another account
    const existingTgUser = db.prepare('SELECT id FROM users WHERE telegram_id = ?').get(telegramId) as { id: string } | undefined;
    if (existingTgUser && existingTgUser.id !== row.user_id) {
      // Free up or update previous binding if needed, or prevent collision
      db.prepare(`
        UPDATE users 
        SET telegram_id = 'unlinked_' || hex(randomblob(4)) || '_' || id, updated_at = datetime('now')
        WHERE telegram_id = ?
      `).run(telegramId);
    }

    // Mark token used
    db.prepare("UPDATE telegram_link_tokens SET used_at = datetime('now') WHERE token_hash = ?").run(tokenHash);

    // Bind telegram_id to the target user
    db.prepare(`
      UPDATE users 
      SET telegram_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(telegramId, row.user_id);

    return {
      success: true,
      userId: row.user_id,
      message: 'Akun Telegram berhasil terhubung dengan akun NIVA Anda!',
    };
  }

  /**
   * Get user by Telegram ID
   */
  public static getUserByTelegramId(telegramId: string): any {
    const db = getDatabase();
    return db.prepare(`
      SELECT u.*, p.display_name, p.age, p.study_field, i.short_name as institution_short_name
      FROM users u
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN institutions i ON i.id = p.institution_id
      WHERE u.telegram_id = ?
    `).get(telegramId);
  }
}
