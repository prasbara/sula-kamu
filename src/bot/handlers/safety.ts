import { InlineKeyboard } from 'grammy';
import { ReportCategory } from '../../types/index';

export class SafetyHandler {
  public static getReportCategoryKeyboard(targetUserId: string): InlineKeyboard {
    const categories: { label: string; cat: ReportCategory }[] = [
      { label: '🛑 Pelecehan / Harassment', cat: 'HARASSMENT' },
      { label: '⚠️ Penipuan / Modus Uang', cat: 'SCAM' },
      { label: '🎭 Akun Palsu / Catfish', cat: 'FAKE_IDENTITY' },
      { label: '🔞 Konten Tidak Senonoh', cat: 'INAPPROPRIATE_CONTENT' },
      { label: '🚨 Ancaman Keamanan', cat: 'THREAT' },
      { label: '📢 Spam / Iklan Berulang', cat: 'SPAM' },
      { label: '👤 Penyamaran Identitas', cat: 'IMPERSONATION' },
      { label: '❓ Alasan Lainnya', cat: 'OTHER' },
    ];

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < categories.length; i += 2) {
      keyboard.text(categories[i].label, `submit_report_${targetUserId}_${categories[i].cat}`);
      if (i + 1 < categories.length) {
        keyboard.text(categories[i + 1].label, `submit_report_${targetUserId}_${categories[i + 1].cat}`);
      }
      keyboard.row();
    }
    keyboard.text('❌ Batal', 'cmd_discover');
    return keyboard;
  }

  public static getSafetyCharterText(): string {
    return (
      `🛡 *PUSAT KEAMANAN & INTEGRITAS SULA*\n\n` +
      `SULA dirancang sejak awal dengan prinsip *Safety First* & *Privacy by Default*:\n\n` +
      `1. *Verifikasi Mahasiswa Asli:* Hanya mahasiswa aktif dari perguruan tinggi di Semarang yang dapat menggunakan fitur matchmaking.\n` +
      `2. *Tanpa Pengungkapan Data Sensitif:* NIM, foto KTM, nomor telepon, dan lokasi presisi GPS tidak pernah dibagikan.\n` +
      `3. *Moderasi & Eskalasi Bertingkat:* Laporan Anda langsung diproses ke meja moderator secara rahasia (anonymized case management).\n` +
      `4. *Tindakan Tegas:* Pelaku pelecehan, penipuan, atau akun palsu akan langsung ditangguhkan secara permanen dari seluruh ekosistem SULA.\n\n` +
      `Butuh bantuan mendesak? Hubungi admin melalui menu ini atau kirim laporan langsung pada obrolan yang bersangkutan.`
    );
  }
}
