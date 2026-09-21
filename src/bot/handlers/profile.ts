import { InlineKeyboard } from 'grammy';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db.js';
import { Profile, RelationshipIntent } from '../../types/index.js';

export const SEMARANG_AREAS = [
  'Tembalang',
  'Sekaran / Gunungpati',
  'Banyumanik',
  'Pleburan / Simpang Lima',
  'Semarang Tengah',
  'Ngaliyan',
  'Pedurungan',
  'Gajahmungkur / Candi',
];

export const AVAILABLE_INTERESTS = [
  'Coding & Tech',
  'Ngopi / Cafe Hopping',
  'Music & Concerts',
  'Badminton & Olahraga',
  'Buku & Diskusi',
  'Film & Series',
  'Fotografi & Art',
  'Traveling & Kuliner',
  'Gaming & Esports',
  'Anime & Pop Culture',
];

export class ProfileHandler {
  /**
   * Screen bio text for unsolicited contact leaks or scam links (Section 7 & 13)
   */
  public static sanitizeBio(text: string): { cleanText: string; hasSuspiciousPatterns: boolean } {
    let clean = text.trim().slice(0, 250);
    
    // Pattern for phone numbers (Indonesian formats e.g. 08xx, +62xx)
    const phoneRegex = /(?:\+?62|08)[0-9\s-]{8,14}/gi;
    // Pattern for direct handles and links
    const linkRegex = /(?:t\.me|wa\.me|instagram\.com|bit\.ly|https?:\/\/)/gi;

    const hasPhone = phoneRegex.test(clean);
    const hasLink = linkRegex.test(clean);

    if (hasPhone || hasLink) {
      return { cleanText: clean, hasSuspiciousPatterns: true };
    }

    return { cleanText: clean, hasSuspiciousPatterns: false };
  }

  /**
   * Render profile preview text
   */
  public static renderProfilePreview(profile: Profile, verifiedShortName: string): string {
    let interestsArr: string[] = [];
    if (Array.isArray(profile.interests)) {
      interestsArr = profile.interests;
    } else if (typeof profile.interests === 'string') {
      try {
        interestsArr = JSON.parse(profile.interests);
      } catch {
        interestsArr = [];
      }
    }
    const interestsList = interestsArr.map((i) => `#${String(i).replace(/\s+/g, '')}`).join(' ');

    return (
      `👤 *PROFIL SULA ANDA*\n\n` +
      `*Nama:* ${profile.display_name}, ${profile.age}\n` +
      `🎓 *Kampus:* ${verifiedShortName} (Terverifikasi)\n` +
      `📚 *Jurusan:* ${profile.study_field}\n` +
      `📍 *Area:* ${profile.coarse_area || 'Semarang'}\n` +
      `🎯 *Tujuan:* ${this.formatIntent(profile.relationship_intent)}\n` +
      `✨ *Minat:* ${interestsList || 'Belum diisi'}\n\n` +
      `📝 *Bio:*\n"${profile.bio || 'Belum ada bio.'}"\n\n` +
      `🔒 *Privasi Aman:* NIM, email, nomor HP, dan username Telegram Anda *TIDAK PERNAH* diperlihatkan kepada orang lain secara publik.`
    );
  }

  public static formatIntent(intent: RelationshipIntent): string {
    switch (intent) {
      case 'DATING':
        return '❤️ Kencan Sehat & Santai';
      case 'NEW_FRIENDS':
        return '☕ Cari Teman Baru';
      case 'STUDY_BUDDY':
        return '📖 Teman Belajar & Diskusi';
      case 'SERIOUS_RELATIONSHIP':
        return '💍 Hubungan Serius';
      default:
        return intent;
    }
  }

  public static getProfileKeyboard(): InlineKeyboard {
    return new InlineKeyboard()
      .text('📸 Unggah Foto Profil', 'upload_profile_photo')
      .row()
      .text('🛡️ Verifikasi Akun', 'cmd_verify_menu')
      .text('⭐ NIVA Premium', 'cmd_premium')
      .row()
      .text('✏️ Ubah Bio', 'edit_bio')
      .text('✨ Ubah Minat', 'edit_interests')
      .row()
      .text('🎯 Ubah Tujuan', 'edit_intent')
      .text('📍 Ubah Area', 'edit_area')
      .row()
      .text('❤️ Mulai Temukan Teman (Discover)', 'cmd_discover');
  }
}
