import { ImageSanitizer } from '../src/services/verification/imageSanitizer.js';
import { VerificationService } from '../src/services/verification/verificationService.js';
import { ProfileHandler } from '../src/bot/handlers/profile.js';
import { MatchingService } from '../src/services/matchmaking/matchingService.js';
import { ModerationService } from '../src/services/safety/moderationService.js';
import { initDatabase, getDatabase } from '../src/database/db.js';
import { seedDatabase } from '../src/database/seed.js';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

async function runSecurityTests() {
  console.log('--- STARTING SULA AUTOMATED SECURITY TEST SUITE ---');
  initDatabase();
  seedDatabase();
  const db = getDatabase();

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
    }
  }

  // TEST 1: Disguised File / Magic Bytes Validation (Section 14)
  console.log('\n1. Image Security & Magic Bytes Check:');
  const fakePhpPayload = Buffer.from('<?php echo "malicious payload"; ?>');
  const check1 = ImageSanitizer.validateMagicBytes(fakePhpPayload);
  assert(!check1.isValid, 'Rejects disguised non-image files with invalid magic bytes');

  const validPng = await sharp({
    create: { width: 10, height: 10, channels: 3, background: { r: 255, g: 0, b: 0 } },
  }).png().toBuffer();
  const check2 = ImageSanitizer.validateMagicBytes(validPng);
  assert(check2.isValid && check2.detectedType === 'image/png', 'Detects authentic PNG magic bytes');

  // TEST 2: EXIF Stripping & Re-encoding (Section 14)
  const sanitized = await ImageSanitizer.sanitizeImage(validPng);
  assert(sanitized.sha256Hash.length === 64, 'Computes SHA-256 fingerprint of sanitized buffer');
  assert(sanitized.perceptualHash.length === 16, 'Generates 64-bit perceptual layout hash');

  // TEST 3: Contact Leak & Phone Number Filtering in Bio (Section 7)
  console.log('\n2. Privacy by Default & Anti-Scam Filter:');
  const leak1 = ProfileHandler.sanitizeBio('Halo kenalan yuk wa ku 081234567890');
  assert(leak1.hasSuspiciousPatterns, 'Detects Indonesian phone number leak in bio');

  const leak2 = ProfileHandler.sanitizeBio('Follow my telegram t.me/someone_scam');
  assert(leak2.hasSuspiciousPatterns, 'Detects external Telegram link in bio');

  const cleanBio = ProfileHandler.sanitizeBio('Mahasiswa teknik yang hobi main badminton dan dengerin jazz.');
  assert(!cleanBio.hasSuspiciousPatterns, 'Allows safe student bio');

  // TEST 4: Verification Rate Limiting & Cooldown (Section 6)
  console.log('\n3. Verification Rate Limiting & Abuse Prevention:');
  const testUserId = uuidv4();
  db.prepare("INSERT OR REPLACE INTO users (id, telegram_id, status) VALUES (?, ?, 'PENDING_VERIFICATION')").run(testUserId, `test-rate-${uuidv4().slice(0, 8)}`);
  
  // Insert 3 past attempts
  for (let i = 0; i < 3; i++) {
    db.prepare(`
      INSERT INTO verification_attempts (id, user_id, card_hash, status, failure_reason)
      VALUES (?, ?, 'hash_${i}', 'FAILED_OCR', 'test attempt')
    `).run(uuidv4(), testUserId);
  }

  const limitResult = VerificationService.checkAttemptLimit(testUserId);
  assert(!limitResult.allowed && limitResult.remainingAttempts === 0, 'Enforces max 3 attempts within cooldown window');

  // TEST 5: Emergency Kill Switch Integration (Section 29)
  console.log('\n4. Incident Response & Emergency Switches:');
  ModerationService.toggleSystemSetting('registrations_enabled', false, 'test-super-admin');
  const row = db.prepare("SELECT value FROM system_settings WHERE key = 'registrations_enabled'").get() as { value: string };
  assert(row.value === 'false', 'Registration kill switch successfully set to false');
  ModerationService.toggleSystemSetting('registrations_enabled', true, 'test-super-admin');

  // TEST 6: Immutable Audit Logs (Section 18 & 27)
  console.log('\n5. Immutable Privileged Audit Logs:');
  ModerationService.logAudit({
    actorId: 'admin-007',
    actorRole: 'SUPER_ADMIN',
    action: 'TEST_SECURITY_ACTION',
    targetResource: 'users',
    details: 'Automated verification test',
  });
  const auditRow = db.prepare("SELECT * FROM audit_logs WHERE actor_id = 'admin-007'").get() as any;
  assert(auditRow !== undefined && auditRow.action === 'TEST_SECURITY_ACTION', 'Privileged action captured in immutable audit trail');

  // TEST 7: Profile Photo Moderation & Anti-NSFW / Nudity Detection (Section 13 & 14)
  console.log('\n6. Photo Safety, Anti-NSFW & Anti-Fake Moderation:');
  const { PhotoModerationService } = await import('../src/services/safety/photoModerationService.js');
  
  // Test 7a: Rejects blank/solid image
  const solidImage = await sharp({
    create: { width: 300, height: 300, channels: 3, background: { r: 50, g: 50, b: 50 } },
  }).jpeg().toBuffer();
  const blankCheck = await PhotoModerationService.inspectProfilePhoto(solidImage);
  assert(!blankCheck.isApproved, 'Rejects blank or solid-color fake profile photos');

  // Test 7b: Rejects image with excessive skin exposure (> 40% skin tone, simulated NSFW)
  // Skin RGB e.g. R=220, G=170, B=140 gives Cb~111, Cr~149 (classic skin tone)
  const excessiveSkinImage = await sharp({
    create: { width: 300, height: 300, channels: 3, background: { r: 220, g: 170, b: 140 } },
  }).jpeg().toBuffer();
  const nsfwCheck = await PhotoModerationService.inspectProfilePhoto(excessiveSkinImage);
  assert(!nsfwCheck.isApproved, 'Detects and rejects excessive skin exposure (NSFW/nude violation)');

  // Test 7c: Approves proper student portrait with balanced clothing and facial tone
  const properPortrait = await sharp({
    create: { width: 300, height: 300, channels: 3, background: { r: 30, g: 41, b: 59 } }, // dark background/clothing
  })
    .composite([
      {
        // Small face region in center (approx 15% of canvas)
        input: await sharp({
          create: { width: 90, height: 110, channels: 3, background: { r: 220, g: 170, b: 140 } },
        }).png().toBuffer(),
        top: 60,
        left: 105,
      },
    ])
    .jpeg()
    .toBuffer();

  const safePortraitCheck = await PhotoModerationService.inspectProfilePhoto(properPortrait);
  assert(safePortraitCheck.isApproved, 'Approves authentic student portrait with proper clothing');

  // TEST 8: OpenRouter AI Vision KTM Validation Module
  console.log('\n7. AI Vision KTM Verification & OCR Engine:');
  const { AiKtmValidator } = await import('../src/services/verification/aiKtmValidator.js');
  const dummyInstitution = {
    id: 'inst-05',
    name: 'Universitas Islam Sultan Agung',
    short_name: 'UNISSULA',
    email_domain: 'unissula.ac.id',
    type: 'PTS' as const,
    campus_cluster: 'Genuk',
    region: 'Semarang',
    is_active: 1,
  };

  // Test 8a: Validator returns well-typed response
  const aiTestResult = await AiKtmValidator.analyzeCard(properPortrait, dummyInstitution, 'Alden');
  assert(
    typeof aiTestResult.confidence === 'number' &&
    ['VERIFIED', 'NEEDS_REVIEW', 'REJECTED'].includes(aiTestResult.verdict) &&
    typeof aiTestResult.reason === 'string',
    'AI KTM Validator produces well-structured verdict and confidence metrics'
  );

  // TEST 9: Fixed 33 Institutions Registry (Section 1)
  console.log('\n8. Fixed 33 Higher-Education Institutions Constraint:');
  const { SEMARANG_INSTITUTIONS } = await import('../lib/constants.js');
  assert(SEMARANG_INSTITUTIONS.length === 33, 'SEMARANG_INSTITUTIONS constants has exactly 33 institutions');
  const dbInstCount = (db.prepare('SELECT COUNT(*) as count FROM institutions').get() as any).count;
  assert(dbInstCount === 33, `Database institutions table contains exactly 33 institutions (found: ${dbInstCount})`);

  // TEST 10: Real User Growth Counter & Public Stats (Section 2, 3, 4, 33)
  console.log('\n9. Real Cumulative User Growth Counter:');
  const { StatisticsService } = await import('../src/services/stats/statisticsService.js');
  const statsBefore = StatisticsService.getPublicStats();
  assert(statsBefore.institutions === 33, 'Public stats reports exactly 33 institutions');
  assert(typeof statsBefore.studentsJoined === 'number', 'Public stats reports numeric studentsJoined count');

  const newUserTestId = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status) VALUES (?, ?, 'ACTIVE')").run(newUserTestId, `stats-user-${newUserTestId.slice(0, 6)}`);
  StatisticsService.recordOnboardingCompletion(newUserTestId);
  const statsAfter = StatisticsService.getPublicStats();
  assert(statsAfter.studentsJoined === statsBefore.studentsJoined + 1, 'Counter increments by 1 upon onboarding completion milestone');

  // Milestone is idempotent (duplicate milestone call does not inflate counter)
  StatisticsService.recordOnboardingCompletion(newUserTestId);
  const statsAfterDuplicate = StatisticsService.getPublicStats();
  assert(statsAfterDuplicate.studentsJoined === statsAfter.studentsJoined, 'Counter does not inflate on duplicate milestone events');

  // TEST 11: Server-Side Daily Like Limits (10 vs 50) (Section 8 & 9)
  console.log('\n10. Server-Side Daily Like Limits Enforcement:');
  // 11a: Unverified user (Limit = 10)
  const unverifiedUserId = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status, verification_status) VALUES (?, ?, 'ACTIVE', 'UNVERIFIED')").run(unverifiedUserId, `unverif-${unverifiedUserId.slice(0, 6)}`);
  const unverifiedAllowance = MatchingService.getUserDailyLikeAllowance(unverifiedUserId);
  assert(unverifiedAllowance === 10, `Unverified user daily like allowance is 10 (actual: ${unverifiedAllowance})`);

  // 11b: Photo Verified user (Limit = 50)
  const photoVerifiedUserId = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status, verification_status) VALUES (?, ?, 'ACTIVE', 'PHOTO_VERIFIED')").run(photoVerifiedUserId, `photoverif-${photoVerifiedUserId.slice(0, 6)}`);
  const photoAllowance = MatchingService.getUserDailyLikeAllowance(photoVerifiedUserId);
  assert(photoAllowance === 50, `Photo Verified user daily like allowance is 50 (actual: ${photoAllowance})`);

  // 11c: KTM Verified user (Limit = 50)
  const ktmVerifiedUserId = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status, verification_status) VALUES (?, ?, 'ACTIVE', 'KTM_VERIFIED')").run(ktmVerifiedUserId, `ktmverif-${ktmVerifiedUserId.slice(0, 6)}`);
  const ktmAllowance = MatchingService.getUserDailyLikeAllowance(ktmVerifiedUserId);
  assert(ktmAllowance === 50, `KTM Verified user daily like allowance is 50 (actual: ${ktmAllowance})`);

  // 11d: Atomic Like Limit Exhaustion and Server-side Rejection
  const targetUserTest = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status) VALUES (?, ?, 'ACTIVE')").run(targetUserTest, `target-${targetUserTest.slice(0, 6)}`);
  const today = new Date().toISOString().slice(0, 10);
  // Set unverified user usage to 10
  db.prepare("INSERT OR REPLACE INTO daily_like_usage (user_id, usage_date, like_count) VALUES (?, ?, 10)").run(unverifiedUserId, today);
  const remainingAfterMax = MatchingService.getDailyLikesRemaining(unverifiedUserId).remaining;
  assert(remainingAfterMax === 0, 'Remaining likes reaches 0 when daily limit is exhausted');

  let likeBlocked = false;
  try {
    MatchingService.handleLike(unverifiedUserId, targetUserTest);
  } catch (e: any) {
    likeBlocked = e.message.includes('Batas like harian') || e.message.includes('LIMIT_EXCEEDED');
  }
  assert(likeBlocked, 'Server-side rejects like attempt when daily limit is exhausted');

  // TEST 12: Website Premium Payment Workflow & FIFO Queue (Section 11, 12, 13, 15)
  console.log('\n11. Manual Website Payment Verification & FIFO Queue:');
  const { PaymentService } = await import('../src/services/payment/paymentService.js');
  const plans = PaymentService.getPlans();
  assert(plans.length >= 2, 'Loads active subscription plans (Early Access & Early Launch)');
  assert(plans.some((p) => p.id === 'early_access' && p.price === 5000), 'Early Access plan configured at Rp5.000 / month');
  assert(plans.some((p) => p.id === 'early_launch' && p.price === 8000), 'Early Launch plan configured at Rp8.000 / month');

  // Create payment request
  const payUser = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status) VALUES (?, ?, 'ACTIVE')").run(payUser, `pay-${payUser.slice(0, 6)}`);
  const payReq = PaymentService.createPaymentRequest(payUser, 'early_access', 'QRIS');
  assert(payReq.id.startsWith('PAY-NIVA-'), `Payment request generated with standard code: ${payReq.id}`);
  assert(payReq.amount === 5000, 'Payment request locks correct plan amount (Rp5.000)');

  // Submit proof
  const testProofBuffer = validPng;
  await PaymentService.submitPaymentProof(payReq.id, testProofBuffer);
  const payUnderReview = db.prepare('SELECT status FROM payment_requests WHERE id = ?').get(payReq.id) as any;
  assert(payUnderReview.status === 'UNDER_REVIEW', 'Payment proof submitted and transitioned to UNDER_REVIEW');

  // FIFO Queue order check
  const queue = PaymentService.getPaymentQueue();
  assert(queue.length > 0 && queue.some((q) => q.payment_id === payReq.id), 'Payment request enters admin FIFO queue');

  // TEST 13: Transactional Payment Approval & 1-Month Subscription (Section 17 & 18)
  console.log('\n12. Transactional Premium Activation & Audit:');
  PaymentService.resolvePayment(payReq.id, 'APPROVE', 'admin-tester', 'Bukti QRIS sesuai dan valid');
  const updatedPay = db.prepare('SELECT status FROM payment_requests WHERE id = ?').get(payReq.id) as any;
  assert(updatedPay.status === 'APPROVED', 'Payment status updated to APPROVED');

  const userAfterPayment = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get(payUser) as any;
  assert(userAfterPayment.subscription_status === 'PREMIUM_ACTIVE', 'User subscription_status automatically becomes PREMIUM_ACTIVE');

  const sub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ?").get(payUser) as any;
  assert(sub !== undefined, 'Active subscription record created transactionally');
  const startDate = new Date(sub.starts_at);
  const endDate = new Date(sub.ends_at);
  const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
  assert(durationDays >= 28 && durationDays <= 31, `Subscription duration is exactly 1 month (~30 days, actual: ${durationDays} days)`);

  // Prevent double approval
  let doubleApprovalError = false;
  try {
    PaymentService.resolvePayment(payReq.id, 'APPROVE', 'admin-tester', 'Double approval test');
  } catch {
    doubleApprovalError = true;
  }
  assert(doubleApprovalError, 'Prevents approving a payment request more than once');

  // TEST 14: Super Admin Promotional Premium Grant (Section 20 & 22)
  console.log('\n13. Super Admin Promotional Premium Grant:');
  const promoUser = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status) VALUES (?, ?, 'ACTIVE')").run(promoUser, `promo-${promoUser.slice(0, 6)}`);
  PaymentService.grantPromotionalPremium(promoUser, 30, 'admin-super', 'Community giveaway winner');
  const promoUserDb = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get(promoUser) as any;
  assert(promoUserDb.subscription_status === 'PREMIUM_ACTIVE', 'Promotional premium grant activates user subscription');

  console.log(`\n=============================================`);
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log(`=============================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
