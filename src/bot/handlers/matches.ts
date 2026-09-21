import { InlineKeyboard } from 'grammy';
import { Match, Profile } from '../../types/index.js';

export class MatchesHandler {
  public static renderMatchesList(matches: { match: Match; partnerProfile: Profile }[]): { text: string; keyboard: InlineKeyboard } {
    if (matches.length === 0) {
      const keyboard = new InlineKeyboard().text('❤️ Temukan Teman (Discover)', 'cmd_discover');
      return {
        text: (
          `💬 *Daftar Match Anda*\n\n` +
          `Belum ada match aktif saat ini.\n` +
          `Jelajahi profil mahasiswa Semarang lainnya untuk menemukan koneksi baru!`
        ),
        keyboard,
      };
    }

    const keyboard = new InlineKeyboard();
    let text = `💬 *Daftar Match Aktif Anda (${matches.length})*\n\n`;

    matches.forEach((item, index) => {
      const partner = item.partnerProfile;
      text += `${index + 1}. *${partner.display_name}* (${partner.institution_short_name || 'Kampus'})\n`;
      text += `   📚 ${partner.study_field} | 📍 ${partner.coarse_area || 'Semarang'}\n\n`;

      keyboard.text(`💬 Chat dengan ${partner.display_name}`, `open_chat_${item.match.id}`).row();
    });

    keyboard.text('❤️ Kembali ke Discover', 'cmd_discover');
    return { text, keyboard };
  }

  /**
   * Safety Action Bar rendered alongside chat messages.
   * Phase-aware: shows "Lanjut Berkenalan" (private contact request) only after sandbox unlocks.
   */
  public static getChatSafetyKeyboard(
    matchId: string,
    partnerUserId: string,
    phase: 'SANDBOX' | 'UNLOCKED' | 'TERMINATED' = 'SANDBOX',
    minutesRemaining: number | null = null
  ): InlineKeyboard {
    const kb = new InlineKeyboard();

    if (phase === 'TERMINATED') {
      return kb
        .text('🚫 Blokir', `block_user_${partnerUserId}`)
        .text('🚨 Laporkan', `report_${partnerUserId}`)
        .row()
        .text('⬅️ Kembali ke Daftar Match', 'cmd_matches');
    }

    kb.text('💬 Balas Pesan', `reply_msg_${matchId}`).row();

    if (phase === 'SANDBOX') {
      const label = minutesRemaining !== null
        ? `🛡️ Sandbox Aktif (${minutesRemaining} mnt lagi)`
        : '🛡️ Status Sandbox';
      kb.text(label, `sandbox_status_${matchId}`).row();
    } else if (phase === 'UNLOCKED') {
      // After sandbox: show private contact request button
      kb.text('🤝 Lanjut Berkenalan (Tukar Kontak)', `req_private_${matchId}_${partnerUserId}`).row();
    }

    kb
      .text('🚫 Blokir', `block_user_${partnerUserId}`)
      .text('🚨 Laporkan', `report_${partnerUserId}`)
      .text('👋 Unmatch', `unmatch_${matchId}`)
      .row()
      .text('🛡 Tips Keamanan', 'safety_tips_info')
      .text('⬅️ Matches', 'cmd_matches');

    return kb;
  }

  public static getSafetyTipsText(): string {
    return (
      `🛡 *TIPS KEAMANAN BERKOMUNIKASI DI SULA*\n\n` +
      `1. *Jaga Data Pribadi:* Jangan bagikan NIM, alamat tempat tinggal, atau informasi finansial/rekening kepada siapa pun.\n` +
      `2. *Tetap Berkomunikasi di Platform:* Gunakan fitur chat SULA sebelum memutuskan berpindah ke WhatsApp/Telegram pribadi.\n` +
      `3. *Waspadai Modus Penipuan:* Jangan pernah mentransfer uang atau meminjamkan barang dengan alasan darurat apa pun.\n` +
      `4. *Bertemu di Tempat Umum:* Jika memutuskan bertemu langsung (kopdar), selalu pilih tempat umum yang ramai di area kampus/kafe dan beri tahu teman terdekat Anda.\n` +
      `5. *Gunakan Tombol Laporkan:* Jika seseorang berperilaku tidak sopan, melecehkan, atau mencurigakan, segera gunakan tombol 🚨 Laporkan.`
    );
  }
}
