import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';

export type FeatureType = 'STRANGER_CAM' | 'NIVA_DATING';

export class WaitlistService {
  /**
   * Subscribe user to feature waitlist notifications (e.g. NIVA Dating Apps, Stranger Cam)
   */
  public static joinWaitlist(
    contactInfo: string,
    feature: FeatureType = 'NIVA_DATING',
    userId?: string
  ): { success: boolean; message: string } {
    const trimmed = (contactInfo || '').trim();
    if (!trimmed || trimmed.length < 3) {
      throw new Error('Kontak tidak valid. Masukkan username Telegram (@username) atau email aktif Anda.');
    }

    // Basic format check: either an email or a Telegram handle/alphanumeric
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isTelegram = /^@?[a-zA-Z0-9_]{4,32}$/.test(trimmed);

    if (!isEmail && !isTelegram) {
      throw new Error('Format tidak valid. Gunakan format email (nama@email.com) atau Telegram (@username).');
    }

    const db = getDatabase();
    const id = uuidv4();

    db.prepare(`
      INSERT INTO feature_waitlist (id, user_id, contact_info, feature, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(contact_info, feature) DO UPDATE SET
        user_id = COALESCE(?, user_id),
        created_at = datetime('now')
    `).run(id, userId || null, trimmed, feature, userId || null);

    const featureName = feature === 'NIVA_DATING' ? 'NIVA Dating Apps' : 'NIVA Stranger Cam';

    return {
      success: true,
      message: `Terima kasih! Kontak Anda berhasil terdaftar di daftar tunggu ${featureName}. Kami akan mengabari Anda begitu akses dibuka.`,
    };
  }

  /**
   * Get genuinely tracked waitlist count for a feature.
   * NEVER returns hardcoded / manufactured numbers.
   */
  public static getWaitlistCount(feature: FeatureType = 'NIVA_DATING'): number {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM feature_waitlist WHERE feature = ?
    `).get(feature) as { count: number } | undefined;
    return row ? Number(row.count) : 0;
  }
}
