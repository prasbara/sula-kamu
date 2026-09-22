import { InlineKeyboard } from 'grammy';
import { getDatabase } from '../../database/db';
import { Institution, User } from '../../types/index';
import { NotifyService } from '../../services/notification/notifyService';
import { v4 as uuidv4 } from 'uuid';

export class OnboardingHandler {
  public static getWelcomeMessage(): string {
    return (
      `🎓 *Selamat datang di NIVA*\n` +
      `_Student Social & Matchmaking Platform_\n` +
      `*"Meet someone worth knowing."*\n\n` +
      `🛡 *Pemberitahuan Netralitas Institusi:*\n` +
      `NIVA adalah platform independen untuk komunitas kampus & dewasa di Semarang. ` +
      `NIVA bukan layanan resmi kampus, tidak dimiliki, disponsori, atau berafiliasi dengan universitas mana pun.\n\n` +
      `⚠️ *Aturan Utama Keamanan:*\n` +
      `• *18+ Khusus Dewasa*\n` +
      `• *Sesi chat 20 menit aman & terisolasi*\n` +
      `• *Privasi Terjaga:* NIM, email, dan nomor HP tidak pernah dipublikasikan.\n\n` +
      `Apakah Anda berusia 18 tahun atau lebih dan menyetujui ketentuan di atas?`
    );
  }

  public static getAgeGateKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('✅ Ya, Saya Berusia 18+ & Setuju', 'age_gate_accept')
      .row()
      .text('❌ Tidak, Saya di Bawah 18', 'age_gate_reject');
  }

  /**
   * Render paginated list of 32 Semarang Institutions
   */
  public static getInstitutionKeyboard(page = 0, pageSize = 6): InlineKeyboard {
    const db = getDatabase();
    const institutions = db.prepare('SELECT * FROM institutions WHERE is_active = 1 ORDER BY type ASC, name ASC').all() as unknown as Institution[];
    
    const totalPages = Math.ceil(institutions.length / pageSize);
    const start = page * pageSize;
    const currentSlice = institutions.slice(start, start + pageSize);

    const keyboard = new InlineKeyboard();

    for (const inst of currentSlice) {
      keyboard.text(`${inst.short_name} - ${inst.name.slice(0, 24)}...`, `select_inst_${inst.id}`).row();
    }

    // Pagination row
    const navButtons: { text: string; data: string }[] = [];
    if (page > 0) {
      navButtons.push({ text: '⬅️ Sebelumnya', data: `inst_page_${page - 1}` });
    }
    navButtons.push({ text: `Hal ${page + 1}/${totalPages}`, data: 'noop' });
    if (page < totalPages - 1) {
      navButtons.push({ text: 'Selanjutnya ➡️', data: `inst_page_${page + 1}` });
    }

    for (const btn of navButtons) {
      keyboard.text(btn.text, btn.data);
    }

    return keyboard;
  }

  /**
   * Ensure user record exists in database
   */
  public static getOrCreateUser(telegramId: string, username?: string | null, displayName?: string | null): User {
    const db = getDatabase();
    let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as unknown as User | undefined;

    if (!user) {
      const id = uuidv4();
      const cleanUsername = username ? username.replace(/^@/, '').trim() : null;
      const cleanDisplayName = displayName ? displayName.trim() : null;

      db.prepare(`
        INSERT INTO users (
          id, telegram_id, telegram_username, telegram_display_name,
          status, verification_status, subscription_status,
          bot_state, online_status, is_18_plus, last_seen_at, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?,
          'PENDING_VERIFICATION', 'UNVERIFIED', 'FREE',
          'NEW', 'ONLINE', 0, datetime('now'), datetime('now'), datetime('now')
        )
      `).run(id, telegramId, cleanUsername, cleanDisplayName);

      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as unknown as User;

      // Real Operational Alert to Admin Bot
      try {
        NotifyService.notifyNewUser({
          userId: id,
          name: cleanDisplayName || 'Pengguna Baru',
          institutionName: 'Semarang Community',
          verificationLevel: 'UNVERIFIED',
          source: 'Telegram Bot /start',
        }).catch(() => {});
      } catch {}
    } else {
      // Update presence
      db.prepare(`
        UPDATE users 
        SET last_seen_at = datetime('now'), online_status = 'ONLINE', updated_at = datetime('now')
        WHERE id = ?
      `).run(user.id);
    }

    return user;
  }
}
