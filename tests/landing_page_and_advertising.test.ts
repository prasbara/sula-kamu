import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase, initDatabase } from '../src/database/db';
import { AdvertisingService } from '../src/services/advertising/advertisingService';
import { ReviewService } from '../src/services/review/reviewService';
import { ARTICLES } from '../lib/articles';

// Ensure test DB is initialized
const db = getDatabase();
initDatabase();

describe('NIVA Landing Page, Trust Architecture, Reviews & Advertising Test Suite', () => {
  describe('1. Blog Articles Integrity & Completeness', () => {
    test('contains exactly 12 authentic articles', () => {
      assert.equal(ARTICLES.length, 12, `Expected 12 articles, found ${ARTICLES.length}`);
    });

    test('all articles have unique slugs and required fields', () => {
      const slugs = new Set<string>();
      for (const art of ARTICLES) {
        assert.ok(art.slug && art.slug.length > 3, `Invalid slug for article ${art.title}`);
        assert.ok(!slugs.has(art.slug), `Duplicate slug found: ${art.slug}`);
        slugs.add(art.slug);

        assert.ok(art.title && art.title.length > 5, 'Title too short');
        assert.ok(art.excerpt && art.excerpt.length > 15, 'Excerpt too short');
        assert.ok(art.content && art.content.length > 100, 'Content too short');
        assert.ok(art.author, 'Author is required');
        assert.ok(art.category, 'Category is required');
        assert.ok(art.date, 'Date is required');
      }
    });

    test('contains specific required topics', () => {
      const slugs = ARTICLES.map((a) => a.slug);
      assert.ok(slugs.includes('privasi-saat-berkenalan-online'), 'Missing privacy guide');
      assert.ok(slugs.includes('red-flags-berkenalan-online'), 'Missing red flags guide');
      assert.ok(slugs.includes('cara-menolak-ajakan-bertemu'), 'Missing declining meetups guide');
      assert.ok(slugs.includes('penanganan-pelecehan-online'), 'Missing harassment handling guide');
      assert.ok(slugs.includes('dari-chat-ke-pertemuan-nyata'), 'Missing transition to offline guide');
      assert.ok(slugs.includes('cara-kerja-stranger-matching-niva'), 'Missing how NIVA works guide');
    });
  });

  describe('2. Advertising Inquiries Pipeline', () => {
    test('rejects inquiry with invalid email or short message', () => {
      assert.throws(() => {
        AdvertisingService.createInquiry({
          companyName: 'Kedai Kopi',
          contactName: 'Budi',
          contactEmail: 'invalid-email',
          campaignType: 'SPONSORED_BLOG',
          message: 'Halo saya mau pasang iklan di NIVA untuk kafe saya',
        });
      }, /email/i);

      assert.throws(() => {
        AdvertisingService.createInquiry({
          companyName: 'Kedai Kopi',
          contactName: 'Budi',
          contactEmail: 'budi@kopi.id',
          campaignType: 'SPONSORED_BLOG',
          message: 'pendek',
        });
      }, /minimal 15 karakter/i);
    });

    test('successfully records advertising inquiry with NEW status', () => {
      const email = `test_brand_${Date.now()}@semarang.co.id`;
      const inquiry = AdvertisingService.createInquiry({
        companyName: 'Ruang Kolaborasi Tembalang',
        contactName: 'Andi Nugroho',
        contactEmail: email,
        contactPhone: '081234567890',
        campaignType: 'HOMEPAGE_PLACEMENT',
        budgetRange: '1JT_SAMPAI_3JT',
        targetAudience: 'Mahasiswa UNDIP & Polines',
        message: 'Kami ingin mempromosikan tempat belajar dan coworking space untuk mahasiswa.',
        ipAddress: '127.0.0.1',
      });

      assert.ok(inquiry.id.startsWith('ad_'), 'Expected inquiry ID prefix ad_');
      assert.equal(inquiry.status, 'NEW');
      assert.equal(inquiry.company_name, 'Ruang Kolaborasi Tembalang');

      // Check database retrieval
      const found = db.prepare('SELECT * FROM advertising_inquiries WHERE id = ?').get(inquiry.id) as any;
      assert.ok(found, 'Inquiry should exist in database');
      assert.equal(found.status, 'NEW');
    });

    test('admin can update inquiry status and add notes', () => {
      const email = `test_brand_update_${Date.now()}@semarang.co.id`;
      const inquiry = AdvertisingService.createInquiry({
        companyName: 'Festival Musik Kampus',
        contactName: 'Dina',
        contactEmail: email,
        campaignType: 'STUDENT_EVENT',
        message: 'Proposal sponsorship event pentas musik mahasiswa akhir tahun.',
      });

      const updated = AdvertisingService.updateInquiryStatus({
        inquiryId: inquiry.id,
        status: 'QUALIFIED',
        adminId: 'admin-super-01',
        internalNotes: 'Sudah dihubungi via email, proposal teknis disetujui.',
      });

      assert.equal(updated.status, 'QUALIFIED');
      assert.equal(updated.internal_notes, 'Sudah dihubungi via email, proposal teknis disetujui.');

      // Check audit log was written
      const audit = db.prepare(`
        SELECT * FROM audit_logs 
        WHERE target_resource = 'advertising_inquiries' AND target_id = ? AND action = 'ADVERTISING_INQUIRY_STATUS_UPDATED'
        ORDER BY rowid DESC LIMIT 1
      `).get(inquiry.id) as any;
      assert.ok(audit, 'Audit log should be recorded');
      assert.equal(audit.action, 'ADVERTISING_INQUIRY_STATUS_UPDATED');
    });
  });

  describe('3. Review System with Web Submission & Hidden Status', () => {
    test('submits web review and assigns PENDING_REVIEW status', () => {
      const testName = `Reviewer_${Date.now()}`;
      const rev = ReviewService.submitReview({
        displayName: testName,
        rating: 5,
        reviewText: 'Pengalaman sangat memuaskan, obrolan lancar dan aman dengan mahasiswa sesama Tembalang.',
        recommend: true,
        improvementCategory: 'SAFETY',
        environment: 'PRODUCTION',
      });

      assert.ok(rev.id, 'Expected review ID');
      assert.equal(rev.status, 'PENDING_REVIEW');
      assert.equal(rev.rating, 5);
      assert.equal(rev.display_name, testName);

      // Verify pending review does not appear in public approved reviews
      const publicData = ReviewService.getPublicReviews(50, 0, 'PRODUCTION');
      const foundPublic = publicData.reviews.find((r) => r.id === rev.id);
      assert.equal(foundPublic, undefined, 'Pending review must not be publicly visible');
    });

    test('admin approves review -> becomes visible publicly', () => {
      const testName = `ApprovedUser_${Date.now()}`;
      const rev = ReviewService.submitReview({
        displayName: testName,
        rating: 4,
        reviewText: 'Sangat membantu untuk cari teman diskusi tugas kuliah beda kampus.',
        recommend: true,
        environment: 'PRODUCTION',
      });

      ReviewService.moderateReview(rev.id, 'APPROVE', 'admin-mod-01');

      const publicData = ReviewService.getPublicReviews(50, 0, 'PRODUCTION');
      const foundPublic = publicData.reviews.find((r) => r.id === rev.id);
      assert.ok(foundPublic, 'Approved review should be visible publicly');
      assert.equal(foundPublic.status, 'APPROVED');
    });

    test('admin hides review -> disappears from public reviews', () => {
      const testName = `HiddenUser_${Date.now()}`;
      const rev = ReviewService.submitReview({
        displayName: testName,
        rating: 5,
        reviewText: 'Review yang akan di-hide oleh moderator untuk verifikasi konten.',
        recommend: true,
        environment: 'PRODUCTION',
      });

      ReviewService.moderateReview(rev.id, 'APPROVE', 'admin-mod-01');
      let publicData = ReviewService.getPublicReviews(50, 0, 'PRODUCTION');
      assert.ok(publicData.reviews.some((r) => r.id === rev.id));

      // Now hide it
      ReviewService.moderateReview(rev.id, 'HIDE', 'admin-mod-01', { reason: 'Penyelidikan keluhan' });

      publicData = ReviewService.getPublicReviews(50, 0, 'PRODUCTION');
      assert.ok(!publicData.reviews.some((r) => r.id === rev.id), 'Hidden review must not appear in public reviews');
    });

    test('dynamic stats calculated from database without hardcoded fake values', () => {
      const stats = ReviewService.getReviewStats('PRODUCTION');
      assert.ok(typeof stats.averageRating === 'number', 'averageRating must be numeric');
      assert.ok(typeof stats.totalReviews === 'number', 'totalReviews must be numeric');
      assert.ok(stats.totalReviews >= 0, 'totalReviews must be >= 0');
      assert.ok(stats.distribution[5] !== undefined, 'Star 5 distribution must exist');
    });
  });
});
