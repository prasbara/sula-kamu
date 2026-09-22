import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { config } from '../../config/index';
import { Match, Message, Profile, User } from '../../types/index';

export interface DiscoveryCard {
  profileId: string;
  userId: string;
  displayName: string;
  age: number;
  institutionName: string;
  institutionShortName: string;
  studyField: string;
  bio: string | null;
  interests: string[];
  relationshipIntent: string;
  coarseArea: string | null;
  photoFileId?: string | null;
  verifiedBadge: boolean;
  mutualInterestsCount: number;
}

export interface LikeResult {
  isMatch: boolean;
  matchId?: string;
  matchedProfile?: DiscoveryCard;
  remainingLikes: number;
}

export class MatchingService {
  /**
   * Check if global matchmaking switch is enabled
   */
  public static isMatchmakingEnabled(): boolean {
    const db = getDatabase();
    const row = db.prepare("SELECT value FROM system_settings WHERE key = 'matchmaking_enabled'").get() as { value: string } | undefined;
    return row ? row.value === 'true' : true;
  }

  /**
   * Determine daily like allowance based on user verification and subscription tier (Section 8 & 9)
   * Section 8 Verification Test Matrix:
   * - Case A (FREE + PHOTO_ONLY): 10 discoveries/day
   * - Case B (PREMIUM + PHOTO_ONLY): 10 discoveries/day (Premium features active)
   * - Case C (FREE + KTM_VERIFIED): 50 discoveries/day
   * - Case D (PREMIUM + KTM_VERIFIED): 50 discoveries/day (Premium features active)
   * - Case E (PREMIUM + KTM_VERIFIED -> FREE + KTM_VERIFIED): 50/day remains active
   * - Case F (PREMIUM + PHOTO_ONLY -> FREE + PHOTO_ONLY): 10/day
   */
  public static getUserDailyLikeAllowance(userId: string): number {
    const db = getDatabase();
    const user = db.prepare('SELECT verification_status, subscription_status FROM users WHERE id = ?').get(userId) as
      | { verification_status: string; subscription_status: string }
      | undefined;

    if (!user) return 10;

    // 1. Premium tier grants 50 likes/day in Telegram ecosystem (Paket NIVA 1 & 2)
    if (user.subscription_status === 'PREMIUM_ACTIVE') {
      return 50;
    }

    // 2. Photo + Student KTM Verified grants 30 likes/day
    if (user.verification_status === 'KTM_VERIFIED') {
      return 30;
    }
    const ktm = db.prepare("SELECT status FROM student_verifications WHERE user_id = ? AND status = 'VERIFIED'").get(userId);
    if (ktm) return 30;

    // 3. Photo-only verification or Unverified: 10 likes/day
    return 10;
  }

  /**
   * Get server-enforced likes remaining today
   */
  public static getDailyLikesRemaining(userId: string): { used: number; total: number; remaining: number } {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];
    const allowance = this.getUserDailyLikeAllowance(userId);

    const row = db.prepare('SELECT like_count FROM daily_like_usage WHERE user_id = ? AND usage_date = ?').get(userId, today) as
      | { like_count: number }
      | undefined;

    const used = row ? row.like_count : 0;
    return {
      used,
      total: allowance,
      remaining: Math.max(0, allowance - used),
    };
  }

  /**
   * Get next candidate profiles for discovery
   */
  public static getDiscoveryQueue(userId: string, limit = 5): DiscoveryCard[] {
    const db = getDatabase();

    if (!this.isMatchmakingEnabled()) {
      return [];
    }

    // Enforce exclusive safe chat session lock
    const lock = db.prepare(`
      SELECT uel.session_id
      FROM user_exclusive_locks uel
      JOIN safe_chat_sessions scs ON scs.id = uel.session_id
      WHERE uel.user_id = ? AND uel.released_at IS NULL
        AND scs.status IN ('SAFE_CHAT_WAITING','SAFE_CHAT_ACTIVE','SAFE_CHAT_PAUSED')
    `).get(userId);

    if (lock) {
      throw new Error('EXCLUSIVE_CHAT_ACTIVE: Kamu sedang ngobrol dengan satu match. Selesaikan sesi ini terlebih dahulu sebelum mencari match lain.');
    }

    // Get current user's profile for compatibility scoring
    const myProfile = db.prepare('SELECT p.* FROM profiles p WHERE p.user_id = ?').get(userId) as Profile | undefined;

    const myInterests: string[] = myProfile
      ? typeof myProfile.interests === 'string'
        ? JSON.parse(myProfile.interests)
        : myProfile.interests || []
      : [];

    // Query unvisited profiles excluding blocked users
    const rows = db.prepare(`
      SELECT 
        p.id as profile_id,
        p.user_id,
        p.display_name,
        p.age,
        p.study_field,
        p.bio,
        p.interests,
        p.relationship_intent,
        p.coarse_area,
        p.photo_file_id,
        i.name as institution_name,
        i.short_name as institution_short_name,
        u.verification_status,
        u.subscription_status
      FROM profiles p
      JOIN institutions i ON i.id = p.institution_id
      JOIN users u ON u.id = p.user_id
      WHERE p.user_id != ?
        AND p.is_active = 1
        AND u.status = 'ACTIVE'
        AND p.user_id NOT IN (SELECT to_user_id FROM likes WHERE from_user_id = ?)
        AND p.user_id NOT IN (SELECT to_user_id FROM passes WHERE from_user_id = ?)
        AND p.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)
        AND p.user_id NOT IN (SELECT blocker_id FROM blocks WHERE blocked_id = ?)
      ORDER BY RANDOM()
      LIMIT ?
    `).all(userId, userId, userId, userId, userId, limit) as any[];

    return rows.map((r) => {
      const cardInterests: string[] = typeof r.interests === 'string' ? JSON.parse(r.interests) : r.interests || [];
      const common = cardInterests.filter((x) => myInterests.includes(x)).length;

      const isKtm = r.verification_status === 'KTM_VERIFIED';
      const isPhoto = r.verification_status === 'PHOTO_VERIFIED';

      return {
        profileId: r.profile_id,
        userId: r.user_id,
        displayName: r.display_name,
        age: r.age,
        institutionName: r.institution_name,
        institutionShortName: r.institution_short_name,
        studyField: r.study_field,
        bio: r.bio,
        interests: cardInterests,
        relationshipIntent: r.relationship_intent,
        coarseArea: r.coarse_area,
        photoFileId: r.photo_file_id || null,
        verifiedBadge: isKtm || isPhoto,
        verificationTier: isKtm ? 'STUDENT_VERIFIED' : isPhoto ? 'PHOTO_VERIFIED' : 'UNVERIFIED',
        mutualInterestsCount: common,
      };
    });
  }

  /**
   * Record a LIKE and check for mutual match with server-enforced atomic like allowance
   */
  public static handleLike(fromUserId: string, toUserId: string): LikeResult {
    const db = getDatabase();

    // Enforce exclusive safe chat session lock
    const lock = db.prepare(`
      SELECT uel.session_id
      FROM user_exclusive_locks uel
      JOIN safe_chat_sessions scs ON scs.id = uel.session_id
      WHERE uel.user_id = ? AND uel.released_at IS NULL
        AND scs.status IN ('SAFE_CHAT_WAITING','SAFE_CHAT_ACTIVE','SAFE_CHAT_PAUSED')
    `).get(fromUserId);

    if (lock) {
      throw new Error('EXCLUSIVE_CHAT_ACTIVE: Kamu sedang ngobrol dengan satu match. Selesaikan sesi ini terlebih dahulu sebelum mencari match lain.');
    }

    const today = new Date().toISOString().split('T')[0];
    const { remaining, total, used } = this.getDailyLikesRemaining(fromUserId);

    if (remaining <= 0) {
      throw new Error(`LIMIT_EXCEEDED: Batas like harian Anda telah habis (${total} like/hari). Lakukan verifikasi untuk kuota 50 like/hari!`);
    }

    // Atomic increment of daily like usage
    db.prepare(`
      INSERT INTO daily_like_usage (user_id, usage_date, like_count)
      VALUES (?, ?, 1)
      ON CONFLICT(user_id, usage_date) DO UPDATE SET like_count = like_count + 1
    `).run(fromUserId, today);

    // Record like
    db.prepare(`
      INSERT OR IGNORE INTO likes (id, from_user_id, to_user_id)
      VALUES (?, ?, ?)
    `).run(uuidv4(), fromUserId, toUserId);

    // Check if the other user has liked us (Mutual Match!)
    const reciprocal = db.prepare(`
      SELECT id FROM likes 
      WHERE from_user_id = ? AND to_user_id = ?
    `).get(toUserId, fromUserId);

    if (reciprocal) {
      // Check if match already exists
      let match = db.prepare(`
        SELECT * FROM matches 
        WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)
      `).get(fromUserId, toUserId, toUserId, fromUserId) as Match | undefined;

      let matchId: string;
      if (!match) {
        matchId = uuidv4();
        db.prepare(`
          INSERT INTO matches (id, user_a_id, user_b_id, is_active)
          VALUES (?, ?, ?, 1)
        `).run(matchId, fromUserId, toUserId);
      } else {
        matchId = match.id;
        db.prepare('UPDATE matches SET is_active = 1 WHERE id = ?').run(matchId);
      }

      // Fetch partner profile card
      const partner = this.getProfileByUserId(toUserId);

      return {
        isMatch: true,
        matchId,
        matchedProfile: partner || undefined,
        remainingLikes: Math.max(0, remaining - 1),
      };
    }

    return {
      isMatch: false,
      remainingLikes: Math.max(0, remaining - 1),
    };
  }

  /**
   * Record a PASS
   */
  public static handlePass(fromUserId: string, toUserId: string): void {
    const db = getDatabase();

    // Enforce exclusive safe chat session lock
    const lock = db.prepare(`
      SELECT uel.session_id
      FROM user_exclusive_locks uel
      JOIN safe_chat_sessions scs ON scs.id = uel.session_id
      WHERE uel.user_id = ? AND uel.released_at IS NULL
        AND scs.status IN ('SAFE_CHAT_WAITING','SAFE_CHAT_ACTIVE','SAFE_CHAT_PAUSED')
    `).get(fromUserId);

    if (lock) {
      throw new Error('EXCLUSIVE_CHAT_ACTIVE: Selesaikan sesi dengan match saat ini terlebih dahulu.');
    }

    db.prepare(`
      INSERT OR IGNORE INTO passes (id, from_user_id, to_user_id)
      VALUES (?, ?, ?)
    `).run(uuidv4(), fromUserId, toUserId);
  }

  /**
   * Get all active mutual matches for a user
   */
  public static getUserMatches(userId: string): { match: Match; partnerProfile: Profile }[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        m.id as match_id,
        m.user_a_id,
        m.user_b_id,
        m.is_active,
        m.created_at as match_created_at,
        p.id as profile_id,
        p.user_id as partner_user_id,
        p.display_name,
        p.age,
        p.study_field,
        p.bio,
        p.interests,
        p.relationship_intent,
        p.coarse_area,
        i.name as institution_name,
        i.short_name as institution_short_name
      FROM matches m
      JOIN profiles p ON p.user_id = CASE WHEN m.user_a_id = ? THEN m.user_b_id ELSE m.user_a_id END
      JOIN institutions i ON i.id = p.institution_id
      WHERE (m.user_a_id = ? OR m.user_b_id = ?)
        AND m.is_active = 1
      ORDER BY m.created_at DESC
    `).all(userId, userId, userId) as any[];

    return rows.map((r) => ({
      match: {
        id: r.match_id,
        user_a_id: r.user_a_id,
        user_b_id: r.user_b_id,
        is_active: r.is_active,
        unmatched_by: null,
        unmatched_reason: null,
        created_at: r.match_created_at,
        updated_at: r.match_created_at,
      },
      partnerProfile: {
        id: r.profile_id,
        user_id: r.partner_user_id,
        display_name: r.display_name,
        age: r.age,
        institution_id: '',
        study_field: r.study_field,
        bio: r.bio,
        interests: typeof r.interests === 'string' ? JSON.parse(r.interests) : r.interests,
        relationship_intent: r.relationship_intent,
        coarse_area: r.coarse_area,
        photo_file_id: null,
        is_active: 1,
        institution_name: r.institution_name,
        institution_short_name: r.institution_short_name,
      },
    }));
  }

  /**
   * Relay an in-bot mediated message between matched users
   */
  public static sendMatchMessage(matchId: string, senderUserId: string, content: string): Message {
    const db = getDatabase();

    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND is_active = 1').get(matchId) as Match | undefined;
    if (!match) {
      throw new Error('MATCH_NOT_ACTIVE: Match tidak ditemukan atau sudah tidak aktif.');
    }

    if (match.user_a_id !== senderUserId && match.user_b_id !== senderUserId) {
      throw new Error('UNAUTHORIZED: Anda bukan bagian dari match ini.');
    }

    const recipientUserId = match.user_a_id === senderUserId ? match.user_b_id : match.user_a_id;

    // Check if recipient has blocked sender
    const isBlocked = db.prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(recipientUserId, senderUserId);
    if (isBlocked) {
      throw new Error('BLOCKED: Pesan tidak dapat dikirim.');
    }

    const messageId = uuidv4();
    db.prepare(`
      INSERT INTO messages (id, match_id, sender_id, recipient_id, content)
      VALUES (?, ?, ?, ?, ?)
    `).run(messageId, matchId, senderUserId, recipientUserId, content.trim().slice(0, 1000));

    return {
      id: messageId,
      match_id: matchId,
      sender_id: senderUserId,
      recipient_id: recipientUserId,
      content: content.trim(),
      is_read: 0,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Unmatch a connection
   */
  public static unmatch(matchId: string, userId: string, reason?: string): void {
    const db = getDatabase();
    db.prepare(`
      UPDATE matches 
      SET is_active = 0, unmatched_by = ?, unmatched_reason = ?, updated_at = datetime('now')
      WHERE id = ? AND (user_a_id = ? OR user_b_id = ?)
    `).run(userId, reason || 'User requested unmatch', matchId, userId, userId);
  }

  public static getProfileByUserId(userId: string): DiscoveryCard | null {
    const db = getDatabase();
    const r = db.prepare(`
      SELECT 
        p.id as profile_id,
        p.user_id,
        p.display_name,
        p.age,
        p.study_field,
        p.bio,
        p.interests,
        p.relationship_intent,
        p.coarse_area,
        p.photo_file_id,
        i.name as institution_name,
        i.short_name as institution_short_name,
        sv.status as verif_status
      FROM profiles p
      JOIN institutions i ON i.id = p.institution_id
      JOIN student_verifications sv ON sv.user_id = p.user_id
      WHERE p.user_id = ?
    `).get(userId) as any;

    if (!r) return null;

    return {
      profileId: r.profile_id,
      userId: r.user_id,
      displayName: r.display_name,
      age: r.age,
      institutionName: r.institution_name,
      institutionShortName: r.institution_short_name,
      studyField: r.study_field,
      bio: r.bio,
      interests: typeof r.interests === 'string' ? JSON.parse(r.interests) : r.interests,
      relationshipIntent: r.relationship_intent,
      coarseArea: r.coarse_area,
      photoFileId: r.photo_file_id || null,
      verifiedBadge: r.verif_status === 'VERIFIED',
      mutualInterestsCount: 0,
    };
  }
}
