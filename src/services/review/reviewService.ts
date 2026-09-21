import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { ModerationService } from '../safety/moderationService';

export interface ReviewRecord {
  id: string;
  user_id: string;
  display_name: string;
  rating: number; // 1 to 5
  review_text: string;
  recommend: number; // 1 or 0
  improvement_category: string | null;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string | null;
  admin_response?: string | null;
  admin_response_at?: string | null;
  environment: 'PRODUCTION' | 'TEST';
  created_at: string;
  updated_at: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: {
    1: { count: number; percentage: number };
    2: { count: number; percentage: number };
    3: { count: number; percentage: number };
    4: { count: number; percentage: number };
    5: { count: number; percentage: number };
  };
  recommendPercentage: number;
}

export class ReviewService {
  /**
   * Submit or update user review (1 active review per user rule)
   */
  public static submitReview(input: {
    userId: string;
    rating: number;
    reviewText: string;
    recommend?: boolean;
    improvementCategory?: string;
    environment?: 'PRODUCTION' | 'TEST';
  }): ReviewRecord {
    const db = getDatabase();
    const env = input.environment || 'PRODUCTION';

    // 1. Verify user exists and fetch profile display name
    const user = db.prepare('SELECT id, status, verification_status FROM users WHERE id = ?').get(input.userId) as
      | { id: string; status: string; verification_status: string }
      | undefined;

    if (!user) {
      throw new Error('USER_NOT_FOUND: Pengguna tidak ditemukan.');
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new Error('USER_RESTRICTED: Akun Anda sedang dibatasi dan tidak dapat menulis ulasan.');
    }

    const profile = db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(input.userId) as
      | { display_name: string }
      | undefined;

    const displayName = profile?.display_name || 'Mahasiswa NIVA';

    // 2. Validate rating and text
    const rating = Math.round(Number(input.rating));
    if (isNaN(rating) || rating < 1 || rating > 5) {
      throw new Error('INVALID_RATING: Rating bintang harus berada di antara 1 sampai 5.');
    }

    const cleanText = (input.reviewText || '').trim();
    if (!cleanText || cleanText.length < 10) {
      throw new Error('REVIEW_TOO_SHORT: Ulasan minimal 10 karakter untuk memberikan masukan yang bermakna.');
    }
    if (cleanText.length > 1000) {
      throw new Error('REVIEW_TOO_LONG: Ulasan maksimal 1000 karakter.');
    }

    const allowedCategories = [
      'MATCHING',
      'DISCOVERY',
      'VERIFICATION',
      'TELEGRAM',
      'WEBSITE',
      'PREMIUM',
      'SAFETY',
      'PERFORMANCE',
      'OTHER',
    ];
    const category = input.improvementCategory && allowedCategories.includes(input.improvementCategory.toUpperCase())
      ? input.improvementCategory.toUpperCase()
      : null;

    const recommendVal = input.recommend === false ? 0 : 1;

    // 3. Upsert review (1 active review per user - allow updating their review)
    const existing = db.prepare('SELECT id FROM reviews WHERE user_id = ?').get(input.userId) as { id: string } | undefined;

    if (existing) {
      db.prepare(`
        UPDATE reviews 
        SET rating = ?, review_text = ?, recommend = ?, improvement_category = ?,
            status = 'PENDING_REVIEW', updated_at = datetime('now')
        WHERE id = ?
      `).run(rating, cleanText, recommendVal, category, existing.id);

      return db.prepare('SELECT * FROM reviews WHERE id = ?').get(existing.id) as unknown as ReviewRecord;
    } else {
      const reviewId = uuidv4();
      db.prepare(`
        INSERT INTO reviews (
          id, user_id, display_name, rating, review_text, recommend,
          improvement_category, status, environment, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING_REVIEW', ?, datetime('now'), datetime('now'))
      `).run(reviewId, input.userId, displayName, rating, cleanText, recommendVal, category, env);

      return db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as unknown as ReviewRecord;
    }
  }

  /**
   * Get public approved reviews (Section 25)
   */
  public static getPublicReviews(limit = 20, offset = 0, environment = 'PRODUCTION'): { reviews: ReviewRecord[]; total: number } {
    const db = getDatabase();

    const countRow = db.prepare(`
      SELECT COUNT(*) as total 
      FROM reviews 
      WHERE status = 'APPROVED' AND environment = ?
    `).get(environment) as { total: number };

    const reviews = db.prepare(`
      SELECT 
        r.id,
        r.user_id,
        r.display_name,
        r.rating,
        r.review_text,
        r.recommend,
        r.improvement_category,
        r.admin_response,
        r.admin_response_at,
        r.created_at,
        p.study_field,
        i.short_name as institution_short_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN profiles p ON p.user_id = r.user_id
      LEFT JOIN institutions i ON i.id = p.institution_id
      WHERE r.status = 'APPROVED' AND r.environment = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(environment, limit, offset) as unknown as ReviewRecord[];

    return { reviews, total: countRow.total };
  }

  /**
   * Dynamically calculate real aggregated rating statistics (Sections 26 & 27)
   * Never hardcodes review counters or fake star distributions.
   */
  public static getReviewStats(environment = 'PRODUCTION'): ReviewStats {
    const db = getDatabase();

    const rows = db.prepare(`
      SELECT rating, recommend 
      FROM reviews 
      WHERE status = 'APPROVED' AND environment = ?
    `).all(environment) as Array<{ rating: number; recommend: number }>;

    const totalReviews = rows.length;

    const counts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let ratingSum = 0;
    let recommendSum = 0;

    for (const r of rows) {
      if (counts[r.rating] !== undefined) {
        counts[r.rating]++;
      }
      ratingSum += r.rating;
      if (r.recommend === 1) {
        recommendSum++;
      }
    }

    const averageRating = totalReviews > 0 ? Math.round((ratingSum / totalReviews) * 10) / 10 : 0;
    const recommendPercentage = totalReviews > 0 ? Math.round((recommendSum / totalReviews) * 100) : 0;

    const distribution = {
      5: { count: counts[5], percentage: totalReviews > 0 ? Math.round((counts[5] / totalReviews) * 100) : 0 },
      4: { count: counts[4], percentage: totalReviews > 0 ? Math.round((counts[4] / totalReviews) * 100) : 0 },
      3: { count: counts[3], percentage: totalReviews > 0 ? Math.round((counts[3] / totalReviews) * 100) : 0 },
      2: { count: counts[2], percentage: totalReviews > 0 ? Math.round((counts[2] / totalReviews) * 100) : 0 },
      1: { count: counts[1], percentage: totalReviews > 0 ? Math.round((counts[1] / totalReviews) * 100) : 0 },
    };

    return {
      averageRating,
      totalReviews,
      distribution,
      recommendPercentage,
    };
  }

  /**
   * Admin review moderation (Section 23 & 30)
   */
  public static moderateReview(
    reviewIdOrOpts: string | { reviewId: string; action: 'APPROVE' | 'REJECT' | 'RESPOND'; adminId: string; reason?: string; adminResponse?: string },
    actionArg?: 'APPROVE' | 'REJECT' | 'RESPOND',
    adminIdArg?: string,
    optionsArg?: { reason?: string; adminResponse?: string }
  ): ReviewRecord {
    let reviewId: string;
    let action: 'APPROVE' | 'REJECT' | 'RESPOND';
    let adminId: string;
    let options: { reason?: string; adminResponse?: string } | undefined;

    if (typeof reviewIdOrOpts === 'object') {
      reviewId = reviewIdOrOpts.reviewId;
      action = reviewIdOrOpts.action;
      adminId = reviewIdOrOpts.adminId;
      options = { reason: reviewIdOrOpts.reason, adminResponse: reviewIdOrOpts.adminResponse };
    } else {
      reviewId = reviewIdOrOpts;
      action = actionArg!;
      adminId = adminIdArg!;
      options = optionsArg;
    }

    const db = getDatabase();
    const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as ReviewRecord | undefined;
    if (!review) {
      throw new Error('REVIEW_NOT_FOUND: Ulasan tidak ditemukan.');
    }

    if (action === 'APPROVE') {
      db.prepare(`
        UPDATE reviews 
        SET status = 'APPROVED', rejection_reason = null, updated_at = datetime('now')
        WHERE id = ?
      `).run(reviewId);

      ModerationService.logAudit({
        actorId: adminId,
        actorRole: 'MODERATOR',
        action: 'REVIEW_APPROVED',
        targetResource: 'reviews',
        targetId: reviewId,
        details: `Approved review by ${review.display_name} (${review.rating} stars)`,
      });
    } else if (action === 'REJECT') {
      const reason = options?.reason || 'Pelanggaran pedoman konten ulasan';
      db.prepare(`
        UPDATE reviews 
        SET status = 'REJECTED', rejection_reason = ?, updated_at = datetime('now')
        WHERE id = ?
      `).run(reason, reviewId);

      ModerationService.logAudit({
        actorId: adminId,
        actorRole: 'MODERATOR',
        action: 'REVIEW_REJECTED',
        targetResource: 'reviews',
        targetId: reviewId,
        details: `Rejected review ${reviewId}. Reason: ${reason}`,
      });
    } else if (action === 'RESPOND') {
      const responseText = (options?.adminResponse || '').trim();
      if (!responseText) throw new Error('EMPTY_RESPONSE: Tanggapan admin tidak boleh kosong.');

      db.prepare(`
        UPDATE reviews 
        SET admin_response = ?, admin_response_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(responseText, reviewId);

      ModerationService.logAudit({
        actorId: adminId,
        actorRole: 'SUPPORT_ADMIN',
        action: 'REVIEW_RESPONDED',
        targetResource: 'reviews',
        targetId: reviewId,
        details: `Admin replied publicly to review ${reviewId}`,
      });
    }

    return db.prepare('SELECT * FROM reviews WHERE id = ?').get(reviewId) as unknown as ReviewRecord;
  }

  /**
   * Admin queue retrieval
   */
  public static getAdminReviewQueue(statusFilter?: string): any[] {
    const db = getDatabase();
    let query = `
      SELECT 
        r.*,
        p.study_field,
        i.short_name as institution_short_name,
        u.verification_status,
        u.subscription_status
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      LEFT JOIN profiles p ON p.user_id = r.user_id
      LEFT JOIN institutions i ON i.id = p.institution_id
    `;

    if (statusFilter && statusFilter !== 'ALL') {
      query += ` WHERE r.status = '${statusFilter}' `;
    }

    query += ' ORDER BY r.created_at DESC ';

    return db.prepare(query).all();
  }
}
