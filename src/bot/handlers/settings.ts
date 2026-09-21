import { InlineKeyboard } from 'grammy';
import { getDatabase } from '../../database/db.js';
import { ModerationService } from '../../services/safety/moderationService.js';

export class SettingsHandler {
  public static getSettingsKeyboard(isDiscoverable: boolean): InlineKeyboard {
    const toggleText = isDiscoverable ? '⏸ Nonaktifkan Sementara dari Discover' : '▶️ Aktifkan Kembali di Discover';
    return new InlineKeyboard()
      .text(toggleText, 'toggle_discoverable')
      .row()
      .text('🗑 Hapus Akun & Seluruh Data Saya', 'delete_account_confirm')
      .row()
      .text('🛡 Pusat Keamanan', 'cmd_safety')
      .text('⬅️ Menu Utama', 'cmd_menu');
  }

  /**
   * Complete account deletion (Right to be Forgotten)
   * Wipes profile, matches, messages, verifications, and marks user as DELETED
   */
  public static deleteUserAccount(userId: string): void {
    const db = getDatabase();

    // Cascades delete profiles, verifications, matches, messages via foreign keys
    db.prepare('DELETE FROM profiles WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM student_verifications WHERE user_id = ?').run(userId);
    db.prepare("UPDATE users SET status = 'DELETED', updated_at = datetime('now') WHERE id = ?").run(userId);

    ModerationService.logAudit({
      actorId: userId,
      actorRole: 'USER',
      action: 'SELF_ACCOUNT_DELETION',
      targetResource: 'users',
      targetId: userId,
      details: 'User invoked complete account deletion and data wipe',
    });
  }
}
