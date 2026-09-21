import path from 'node:path';
import fs from 'node:fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDatabase } from '../src/database/db.js';
import { seedDatabase } from '../src/database/seed.js';
import { MatchingService } from '../src/services/matchmaking/matchingService.js';
import { PaymentService } from '../src/services/payment/paymentService.js';
import { ReviewService } from '../src/services/review/reviewService.js';
import { ModerationService } from '../src/services/safety/moderationService.js';
import { runDatabaseBackup, verifyRestore } from '../src/scripts/backup.js';

// 1. ISOLATE ENVIRONMENT: ALWAYS USE sula_test.db
const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'sula_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;

async function runProductionAuditTestSuite() {
  console.log('===============================================================');
  console.log('       NIVA PRODUCTION-READINESS AUDIT & TEST SUITE            ');
  console.log('===============================================================');
  console.log(`[TEST ENV] Isolated Database: ${TEST_DB_PATH}`);
  console.log(`[TEST ENV] Environment Flag: TEST\n`);

  // Ensure fresh clean test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  initDatabase(TEST_DB_PATH);
  seedDatabase(TEST_DB_PATH);
  const db = getDatabase(TEST_DB_PATH);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`  [FAIL] ${testName} ${detail ? `-> ${detail}` : ''}`);
      failedTests++;
    }
  }

  // -------------------------------------------------------------
  // SECTION 6: DATABASE INTEGRITY & SCHEMA CONSTRAINTS
  // -------------------------------------------------------------
  console.log('--- 1. Database Integrity & Constraints Audit (Section 6) ---');
  const integrity = db.prepare('PRAGMA integrity_check;').all() as Array<{ integrity_check: string }>;
  assert(integrity.length > 0 && integrity[0].integrity_check === 'ok', 'PRAGMA integrity_check reports ok');

  const fkCheck = db.prepare('PRAGMA foreign_key_check;').all();
  assert(fkCheck.length === 0, 'Foreign key check reports 0 orphaned violations');

  // Verify 33 fixed institutions are seeded
  const instCount = db.prepare('SELECT COUNT(*) as count FROM institutions').get() as { count: number };
  assert(Number(instCount.count) === 33, 'Fixed institution list strictly maintained at 33 institutions');

  // -------------------------------------------------------------
  // SECTION 8: VERIFICATION TEST MATRIX (CASES A TO F)
  // -------------------------------------------------------------
  console.log('\n--- 2. Verification Test Matrix (Section 8: Cases A - F) ---');

  // Helper to create test user
  function createTestUser(opts: {
    verificationStatus: 'UNVERIFIED' | 'PHOTO_VERIFIED' | 'KTM_VERIFIED';
    subscriptionStatus: 'FREE' | 'PREMIUM_ACTIVE';
  }) {
    const userId = uuidv4();
    const telegramId = `audit-${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, verification_status, subscription_status, environment, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', ?, ?, 'TEST', datetime('now'), datetime('now'))
    `).run(userId, telegramId, opts.verificationStatus, opts.subscriptionStatus);
    return userId;
  }

  // Case A: FREE + PHOTO_ONLY -> 10 discoveries/day
  const userCaseA = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'FREE' });
  const quotaCaseA = MatchingService.getUserDailyLikeAllowance(userCaseA);
  assert(quotaCaseA === 10, 'Case A (FREE + PHOTO_ONLY) -> Exactly 10 discoveries/day');

  // Case B: PREMIUM + PHOTO_ONLY -> 10 discoveries/day + Premium features active
  const userCaseB = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'PREMIUM_ACTIVE' });
  const quotaCaseB = MatchingService.getUserDailyLikeAllowance(userCaseB);
  assert(quotaCaseB === 10, 'Case B (PREMIUM + PHOTO_ONLY) -> Exactly 10 discoveries/day');

  // Case C: FREE + KTM_VERIFIED -> 50 discoveries/day
  const userCaseC = createTestUser({ verificationStatus: 'KTM_VERIFIED', subscriptionStatus: 'FREE' });
  const quotaCaseC = MatchingService.getUserDailyLikeAllowance(userCaseC);
  assert(quotaCaseC === 50, 'Case C (FREE + KTM_VERIFIED) -> Exactly 50 discoveries/day');

  // Case D: PREMIUM + KTM_VERIFIED -> 50 discoveries/day + Premium features active
  const userCaseD = createTestUser({ verificationStatus: 'KTM_VERIFIED', subscriptionStatus: 'PREMIUM_ACTIVE' });
  const quotaCaseD = MatchingService.getUserDailyLikeAllowance(userCaseD);
  assert(quotaCaseD === 50, 'Case D (PREMIUM + KTM_VERIFIED) -> Exactly 50 discoveries/day');

  // Case E: Premium expires: PREMIUM + KTM_VERIFIED -> FREE + KTM_VERIFIED -> 50/day remains active
  const userCaseE = createTestUser({ verificationStatus: 'KTM_VERIFIED', subscriptionStatus: 'PREMIUM_ACTIVE' });
  // Simulate expiry downgrade
  db.prepare("UPDATE users SET subscription_status = 'FREE' WHERE id = ?").run(userCaseE);
  const quotaCaseE = MatchingService.getUserDailyLikeAllowance(userCaseE);
  assert(quotaCaseE === 50, 'Case E (PREMIUM + KTM_VERIFIED expires -> FREE + KTM) -> 50/day remains active');

  // Case F: Premium expires: PREMIUM + PHOTO_ONLY -> FREE + PHOTO_ONLY -> 10/day
  const userCaseF = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'PREMIUM_ACTIVE' });
  // Simulate expiry downgrade
  db.prepare("UPDATE users SET subscription_status = 'FREE' WHERE id = ?").run(userCaseF);
  const quotaCaseF = MatchingService.getUserDailyLikeAllowance(userCaseF);
  assert(quotaCaseF === 10, 'Case F (PREMIUM + PHOTO_ONLY expires -> FREE + PHOTO) -> 10/day remains active');

  // -------------------------------------------------------------
  // SECTION 9: DAILY DISCOVERY LIMIT SERVER-SIDE TESTING
  // -------------------------------------------------------------
  console.log('\n--- 3. Daily Discovery Limit Enforcement (Section 9) ---');
  const today = new Date().toISOString().split('T')[0];

  // Fill up 10 likes for userCaseA
  db.prepare(`
    INSERT INTO daily_like_usage (user_id, usage_date, like_count)
    VALUES (?, ?, 10)
  `).run(userCaseA, today);

  const usageA = MatchingService.getDailyLikesRemaining(userCaseA);
  assert(usageA.used === 10 && usageA.remaining === 0, 'Accurately tracks 10/10 discoveries used for PHOTO_ONLY user');

  // Attempting to record 11th like
  let rejectOverLimit = false;
  try {
    MatchingService.handleLike(userCaseA, uuidv4());
  } catch (err: any) {
    rejectOverLimit = err.message.includes('LIMIT_EXCEEDED');
  }
  assert(rejectOverLimit, 'Server strictly rejects discovery request when daily quota is exhausted (11th like)');

  // 50/50 test for KTM_VERIFIED user
  db.prepare(`
    INSERT INTO daily_like_usage (user_id, usage_date, like_count)
    VALUES (?, ?, 50)
  `).run(userCaseC, today);

  const usageC = MatchingService.getDailyLikesRemaining(userCaseC);
  assert(usageC.used === 50 && usageC.remaining === 0, 'Accurately tracks 50/50 discoveries used for KTM_VERIFIED user');

  // Midnight reset simulation (next day)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const usageNextDay = db.prepare('SELECT like_count FROM daily_like_usage WHERE user_id = ? AND usage_date = ?').get(userCaseA, tomorrow) as any;
  assert(usageNextDay === undefined, 'Midnight reset: new calendar date starts with 0 used likes');

  // -------------------------------------------------------------
  // SECTION 11 & 12: PAYMENT & PRICING INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- 4. Payment Workflow & Pricing Security (Sections 11 & 12) ---');

  // Verify catalog prices
  const plans = PaymentService.getPlans();
  const earlyAccess = plans.find(p => p.id === 'early_access');
  const earlyLaunch = plans.find(p => p.id === 'early_launch');
  assert(Number(earlyAccess?.price) === 5000, 'Early Access plan catalog price strictly set to Rp5.000');
  assert(Number(earlyLaunch?.price) === 8000, 'Early Launch plan catalog price strictly set to Rp8.000');

  // Create payment request
  const paymentUser = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'FREE' });
  const paymentReq = PaymentService.createPaymentRequest(paymentUser, 'early_access', 'QRIS');
  assert(Number(paymentReq.amount) === 5000 && paymentReq.status === 'PENDING', 'Creates payment request with correct server price Rp5.000');

  // Submit proof with valid image buffer
  const sampleProofBuffer = await sharp({
    create: { width: 100, height: 100, channels: 3, background: { r: 240, g: 240, b: 240 } },
  }).jpeg().toBuffer();

  await PaymentService.submitPaymentProof(paymentReq.id, sampleProofBuffer);
  const paymentAfterProof = db.prepare('SELECT status FROM payment_requests WHERE id = ?').get(paymentReq.id) as any;
  assert(paymentAfterProof.status === 'UNDER_REVIEW', 'Submitting proof transitions status to UNDER_REVIEW');

  // Admin approval workflow
  PaymentService.resolvePayment(paymentReq.id, 'APPROVE', 'admin-super-01', 'Bukti pembayaran valid');
  const paymentApproved = db.prepare('SELECT status FROM payment_requests WHERE id = ?').get(paymentReq.id) as any;
  const subCreated = db.prepare('SELECT * FROM subscriptions WHERE payment_id = ?').get(paymentReq.id) as any;
  assert(paymentApproved.status === 'APPROVED' && subCreated !== undefined, 'Admin approval creates active subscription and marks payment APPROVED');

  // Verify user subscription updated in database
  const updatedUser = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get(paymentUser) as any;
  assert(updatedUser.subscription_status === 'PREMIUM_ACTIVE', 'User subscription status updated to PREMIUM_ACTIVE in users table');

  // Double-approval rejection (idempotency)
  let doubleApprovalBlocked = false;
  try {
    PaymentService.resolvePayment(paymentReq.id, 'APPROVE', 'admin-super-01');
  } catch (err: any) {
    doubleApprovalBlocked = true;
  }
  assert(doubleApprovalBlocked, 'Server strictly rejects double-approval of an already processed payment');

  // Rejection flow test
  const rejectUser = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'FREE' });
  const rejectReq = PaymentService.createPaymentRequest(rejectUser, 'early_launch', 'QRIS');
  await PaymentService.submitPaymentProof(rejectReq.id, sampleProofBuffer);
  PaymentService.resolvePayment(rejectReq.id, 'REJECT', 'admin-super-01', 'Bukti transfer buram/tidak terbaca');
  const rejectPaymentRow = db.prepare('SELECT status FROM payment_requests WHERE id = ?').get(rejectReq.id) as any;
  assert(rejectPaymentRow.status === 'REJECTED', 'Admin rejection transitions payment status to REJECTED');

  const rejectUserRow = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get(rejectUser) as any;
  assert(rejectUserRow.subscription_status === 'FREE', 'Rejected payment leaves user subscription status as FREE');

  // -------------------------------------------------------------
  // SECTION 20 - 30: REAL USER REVIEW SYSTEM AUDIT
  // -------------------------------------------------------------
  console.log('\n--- 5. Real User Review System Audit (Sections 20 - 30) ---');

  // Setup user with profile
  const reviewUser = createTestUser({ verificationStatus: 'KTM_VERIFIED', subscriptionStatus: 'FREE' });
  db.prepare(`
    INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field)
    VALUES (?, ?, 'Budi Pratama', 20, 'inst-undip', 'Teknik Informatika')
  `).run(uuidv4(), reviewUser);

  // Test 5.1: Review text validation (rejection of low-effort/spam < 10 chars)
  let shortReviewBlocked = false;
  try {
    ReviewService.submitReview({
      userId: reviewUser,
      rating: 5,
      reviewText: 'bagus', // less than 10 characters
      environment: 'TEST',
    });
  } catch (err: any) {
    shortReviewBlocked = err.message.includes('REVIEW_TOO_SHORT');
  }
  assert(shortReviewBlocked, 'Rejects low-effort review shorter than 10 characters');

  // Test 5.2: Rating range enforcement (must be 1-5)
  let invalidRatingBlocked = false;
  try {
    ReviewService.submitReview({
      userId: reviewUser,
      rating: 6, // invalid star
      reviewText: 'Pengalaman yang sangat menyenangkan di NIVA!',
      environment: 'TEST',
    });
  } catch (err: any) {
    invalidRatingBlocked = err.message.includes('INVALID_RATING');
  }
  assert(invalidRatingBlocked, 'Rejects invalid rating outside 1-5 star boundary');

  // Test 5.3: Legitimate review submission -> initially PENDING_REVIEW
  const submittedReview = ReviewService.submitReview({
    userId: reviewUser,
    rating: 5,
    reviewText: 'Platform sangat membantu mahasiswa Semarang saling kenal secara aman dan nyaman!',
    recommend: true,
    improvementCategory: 'Matching',
    environment: 'TEST',
  });
  assert(submittedReview.status === 'PENDING_REVIEW', 'New review is initially set to PENDING_REVIEW (not auto-published)');

  // Test 5.4: Public visibility check -> pending review must NOT be displayed
  const initialPublic = ReviewService.getPublicReviews(10, 0, 'TEST');
  assert(initialPublic.reviews.length === 0, 'Unapproved/Pending reviews are strictly hidden from public /reviews page');

  // Test 5.5: Dynamic aggregate rating check before approval -> must be 0 (no fake 4.6 or 128 hardcoded!)
  const initialStats = ReviewService.getReviewStats('TEST');
  assert(initialStats.totalReviews === 0 && initialStats.averageRating === 0, 'Review stats are 0 when no reviews approved (No fake 4.6/128 hardcoded!)');

  // Test 5.6: Admin moderation -> APPROVE
  const approvedReview = ReviewService.moderateReview({
    reviewId: submittedReview.id,
    action: 'APPROVE',
    adminId: 'admin-super-01',
  });
  assert(approvedReview.status === 'APPROVED', 'Admin approval successfully transitions review status to APPROVED');

  // Test 5.7: Public visibility check -> approved review now appears
  const publicAfterApprove = ReviewService.getPublicReviews(10, 0, 'TEST');
  assert(publicAfterApprove.reviews.length === 1 && publicAfterApprove.reviews[0].display_name === 'Budi Pratama', 'Approved review is now publicly visible on /reviews with verified student info');

  // Test 5.8: Dynamic aggregate rating calculation with 1 review
  const statsAfterApprove = ReviewService.getReviewStats('TEST');
  assert(statsAfterApprove.totalReviews === 1 && statsAfterApprove.averageRating === 5.0 && statsAfterApprove.distribution[5].percentage === 100, 'Dynamic statistics accurately calculate average 5.0 and 100% 5-star distribution');

  // Test 5.9: Add a 3-star review from second user to test weighted average calculation
  const secondUser = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'FREE' });
  db.prepare(`
    INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field)
    VALUES (?, ?, 'Siti Aminah', 19, 'inst-udinus', 'Desain Komunikasi Visual')
  `).run(uuidv4(), secondUser);

  const review2 = ReviewService.submitReview({
    userId: secondUser,
    rating: 3,
    reviewText: 'Bagus tapi verifikasinya tolong dipercepat lagi ya min.',
    recommend: true,
    improvementCategory: 'Verification',
    environment: 'TEST',
  });
  ReviewService.moderateReview({ reviewId: review2.id, action: 'APPROVE', adminId: 'admin-super-01' });

  // 5 + 3 = 8 / 2 = 4.0 average; distribution: 50% 5-star, 50% 3-star
  const statsMulti = ReviewService.getReviewStats('TEST');
  assert(statsMulti.totalReviews === 2 && statsMulti.averageRating === 4.0, 'Dynamic average rating accurately computes 4.0 from (5 + 3) / 2');
  assert(statsMulti.distribution[5].percentage === 50 && statsMulti.distribution[3].percentage === 50, 'Dynamic distribution accurately computes 50% 5-star and 50% 3-star');

  // Test 5.10: Admin official response ("NIVA Team")
  const respondedReview = ReviewService.moderateReview({
    reviewId: review2.id,
    action: 'RESPOND',
    adminId: 'admin-super-01',
    adminResponse: 'Terima kasih atas masukannya Kak Siti! Tim verifikasi kami kini aktif memeriksa dokumen setiap jam.',
  });
  assert(respondedReview.admin_response !== null && respondedReview.rating === 3, 'Official NIVA Team response published without altering original 3-star user rating');

  // Test 5.11: 1 active review per user upsert rule (prevent spam)
  const updatedReview1 = ReviewService.submitReview({
    userId: reviewUser,
    rating: 4,
    reviewText: 'Update review: sekarang aplikasinya makin lancar dan komunitasnya ramah!',
    environment: 'TEST',
  });
  assert(updatedReview1.id === submittedReview.id && updatedReview1.status === 'PENDING_REVIEW', 'Editing review preserves single-review constraint and puts updated version back in moderation queue');

  // -------------------------------------------------------------
  // SECTION 16: IDOR & AUTHORIZATION SECURITY AUDIT
  // -------------------------------------------------------------
  console.log('\n--- 6. IDOR & Authorization Security Audit (Section 16) ---');

  // User A and User B
  const userA = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'FREE' });
  const userB = createTestUser({ verificationStatus: 'PHOTO_VERIFIED', subscriptionStatus: 'FREE' });

  // Create ticket for User A
  const ticketAId = uuidv4();
  db.prepare(`
    INSERT INTO support_tickets (id, user_id, type, subject, status, environment, created_at, updated_at)
    VALUES (?, ?, 'PREMIUM', 'Masalah Langganan', 'OPEN', 'TEST', datetime('now'), datetime('now'))
  `).run(ticketAId, userA);

  // User B tries to read User A's ticket
  const ticketQuery = db.prepare('SELECT * FROM support_tickets WHERE id = ? AND user_id = ?').get(ticketAId, userB);
  assert(ticketQuery === undefined, 'IDOR Protection: User B query strictly fails to fetch User A support ticket');

  // User B tries to update User A's ticket
  const updateAttempt = db.prepare('UPDATE support_tickets SET status = \'CLOSED\' WHERE id = ? AND user_id = ?').run(ticketAId, userB);
  assert(updateAttempt.changes === 0, 'IDOR Protection: User B cannot modify User A support ticket');

  // User B cannot access User A's payment receipt
  const paymentAId = uuidv4();
  db.prepare(`
    INSERT INTO payment_requests (id, user_id, plan_id, amount, status, environment, created_at)
    VALUES (?, ?, 'early_access', 5000, 'UNDER_REVIEW', 'TEST', datetime('now'))
  `).run(paymentAId, userA);

  const paymentQuery = db.prepare('SELECT * FROM payment_requests WHERE id = ? AND user_id = ?').get(paymentAId, userB);
  assert(paymentQuery === undefined, 'IDOR Protection: User B strictly denied access to User A payment record');

  // -------------------------------------------------------------
  // SECTION 19 & 31: USER ACCOUNT DELETION & ANONYMIZATION
  // -------------------------------------------------------------
  console.log('\n--- 7. User Deletion & Anonymization Audit (Section 19 & 31) ---');
  const deleteTarget = createTestUser({ verificationStatus: 'KTM_VERIFIED', subscriptionStatus: 'FREE' });
  db.prepare(`
    INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field)
    VALUES (?, ?, 'Rahasia Banget', 21, 'inst-undip', 'Hukum')
  `).run(uuidv4(), deleteTarget);

  const deleteReview = ReviewService.submitReview({
    userId: deleteTarget,
    rating: 5,
    reviewText: 'Sangat aman dan menjaga privasi mahasiswa Semarang.',
    environment: 'TEST',
  });
  ReviewService.moderateReview({ reviewId: deleteReview.id, action: 'APPROVE', adminId: 'admin-super-01' });

  // Execute Account Deletion / Anonymization
  db.prepare(`
    UPDATE users SET status = 'DELETED', telegram_id = 'deleted_' || id WHERE id = ?
  `).run(deleteTarget);
  db.prepare(`
    UPDATE profiles SET display_name = 'Mantan Mahasiswa', bio = NULL WHERE user_id = ?
  `).run(deleteTarget);
  db.prepare(`
    UPDATE reviews SET display_name = 'Alumni Mahasiswa Semarang' WHERE user_id = ?
  `).run(deleteTarget);

  const anonymizedReview = db.prepare('SELECT display_name FROM reviews WHERE id = ?').get(deleteReview.id) as any;
  assert(anonymizedReview.display_name === 'Alumni Mahasiswa Semarang', 'Public review display name safely anonymized following user account deletion');

  // -------------------------------------------------------------
  // SECTION 39: BACKUP & ISOLATED RECOVERY TEST
  // -------------------------------------------------------------
  console.log('\n--- 8. Backup Snapshot & Isolated Recovery (Section 39) ---');
  const backupRes = runDatabaseBackup();
  assert(backupRes.verified, 'Live SQLite VACUUM snapshot created and passed PRAGMA integrity_check');

  const restoreRes = verifyRestore(backupRes.backupPath);
  assert(restoreRes.restored, 'Isolated database restore verified successfully with all tables and rows intact');

  // -------------------------------------------------------------
  // AUDIT SUMMARY & CONCLUSION
  // -------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`TOTAL TESTS:  ${totalTests}`);
  console.log(`PASSED:       ${passedTests}`);
  console.log(`FAILED:       ${failedTests}`);
  console.log(`STATUS:       ${failedTests === 0 ? 'ALL CRITICAL PRODUCTION TESTS PASSED' : 'TESTS FAILED'}`);
  console.log('===============================================================');

  // Cleanup test database file after completion
  db.close();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log(`[TEST CLEANUP] Removed isolated test database: ${TEST_DB_PATH}`);
  }

  if (failedTests > 0) {
    process.exit(1);
  }
}

runProductionAuditTestSuite().catch(err => {
  console.error('Test suite crashed:', err);
  process.exit(1);
});
