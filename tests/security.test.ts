import { ImageSanitizer } from '../src/services/verification/imageSanitizer.js';
import { VerificationService } from '../src/services/verification/verificationService.js';
import { ProfileHandler } from '../src/bot/handlers/profile.js';
import { MatchingService } from '../src/services/matchmaking/matchingService.js';
import { ModerationService } from '../src/services/safety/moderationService.js';
import { initDatabase, getDatabase } from '../src/database/db.js';
import { seedDatabase } from '../src/database/seed.js';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

import path from 'node:path';

async function runSecurityTests() {
  console.log('--- STARTING SULA AUTOMATED SECURITY TEST SUITE ---');
  const TEST_DB = path.resolve(process.cwd(), 'data', 'sula_test.db');
  process.env.DATABASE_PATH = TEST_DB;
  initDatabase(TEST_DB);
  seedDatabase(TEST_DB);
  const db = getDatabase(TEST_DB);

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
  db.prepare("INSERT OR REPLACE INTO users (id, telegram_id, status, environment) VALUES (?, ?, 'PENDING_VERIFICATION', 'TEST')").run(testUserId, `test-rate-${uuidv4().slice(0, 8)}`);
  
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
  assert(photoAllowance === 10, `Photo Verified user daily like allowance is 10 (actual: ${photoAllowance})`);

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

  // ==========================================
  // SECTION 34: MASTER SECURITY TESTS SUITE
  // ==========================================
  console.log('\n--- MASTER SPEC SECTION 34 SECURITY TESTS ---');

  const { AdminAuthService } = await import('../src/services/auth/adminAuthService.js');
  const { SupportService } = await import('../src/services/support/supportService.js');

  // TEST 15: Generic Error & Brute-Force Rate Limiting (Section 3 & 34)
  console.log('\n14. Admin Brute-Force Protection & Lockout:');
  const testAdminUsername = `admin_${uuidv4().slice(0, 6)}`;
  const testIp = `192.168.200.${Math.floor(Math.random() * 200 + 10)}`;
  AdminAuthService.createAdminUser({
    username: testAdminUsername,
    password: 'SuperSecurePassword2026!',
    displayName: 'Test Sec Admin',
    role: 'SUPER_ADMIN',
  });

  // Attempt 5 failed logins
  for (let i = 0; i < 5; i++) {
    let failedGeneric = false;
    try {
      await AdminAuthService.login(testAdminUsername, 'WrongPassword123!', undefined, testIp);
    } catch (e: any) {
      failedGeneric = e.message.includes('INVALID_CREDENTIALS') || e.message.includes('tidak valid');
    }
    assert(failedGeneric, `Failed attempt #${i + 1} rejected with generic message`);
  }

  // 6th attempt must trigger account lockout
  let lockedOut = false;
  try {
    await AdminAuthService.login(testAdminUsername, 'SuperSecurePassword2026!', '123456', testIp);
  } catch (e: any) {
    lockedOut = e.message.includes('TOO_MANY_ATTEMPTS') || e.message.includes('dibatasi') || e.message.includes('dikunci');
  }
  assert(lockedOut, 'Account automatically locked out after 5 consecutive failed attempts');

  // TEST 16: Session Validity, Inactivity Timeout, & Revocation (Section 3, 27, 34)
  console.log('\n15. Admin Session Security & Revocation:');
  const normalAdminUsername = `active_${uuidv4().slice(0, 6)}`;
  AdminAuthService.createAdminUser({
    username: normalAdminUsername,
    password: 'ValidPassword2026!',
    displayName: 'Active Admin',
    role: 'PAYMENT_ADMIN',
  });

  const loginRes = await AdminAuthService.login(normalAdminUsername, 'ValidPassword2026!', '123456', '127.0.0.1');
  assert(!!loginRes.token, 'Successful login generates secure session token');

  // Validate active session
  const validatedSession = AdminAuthService.validateSession(loginRes.token);
  assert(validatedSession !== null && validatedSession.username === normalAdminUsername, 'Validates active server-side session');

  // Test fake/forged session token rejection
  const fakeSession = AdminAuthService.validateSession('forged_fake_token_12345678901234567890123456789012');
  assert(fakeSession === null, 'Rejects forged or non-existent session token');

  // Test session logout / revocation
  AdminAuthService.revokeSession(loginRes.token);
  const revokedCheck = AdminAuthService.validateSession(loginRes.token);
  assert(revokedCheck === null, 'Revoked session cannot be reused (immediate invalidation)');

  // TEST 17: Role-Based Access Control (RBAC) (Section 5, 6, 34)
  console.log('\n16. Server-Side Role-Based Access Control (RBAC):');
  assert(AdminAuthService.hasPermission('SUPER_ADMIN', 'manage_users'), 'SUPER_ADMIN has all permissions');
  assert(AdminAuthService.hasPermission('PAYMENT_ADMIN', 'approve_payments'), 'PAYMENT_ADMIN can approve payments');
  assert(!AdminAuthService.hasPermission('PAYMENT_ADMIN', 'verify_ktm'), 'PAYMENT_ADMIN DENIED verification rights');
  assert(AdminAuthService.hasPermission('VERIFICATION_ADMIN', 'verify_ktm'), 'VERIFICATION_ADMIN can verify KTM');
  assert(!AdminAuthService.hasPermission('VERIFICATION_ADMIN', 'approve_payments'), 'VERIFICATION_ADMIN DENIED payment rights');
  assert(!AdminAuthService.hasPermission('AUDITOR', 'approve_payments'), 'AUDITOR DENIED mutation rights');

  // TEST 18: Telegram /premium Ticket Creation & Anti-Duplication (Section 10, 11, 33, 34)
  console.log('\n17. Telegram /premium Ticket Anti-Duplication:');
  const tgUser = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status) VALUES (?, ?, 'ACTIVE')").run(tgUser, `tg-${tgUser.slice(0, 8)}`);

  const ticket1 = SupportService.getOrCreatePremiumTicket(tgUser);
  assert(ticket1.ticket.id.startsWith('NIVA-PREM-') && ticket1.isNew, `Creates new premium support ticket: ${ticket1.ticket.id}`);

  // Re-run /premium for same user
  const ticket2 = SupportService.getOrCreatePremiumTicket(tgUser);
  assert(!ticket2.isNew && ticket2.ticket.id === ticket1.ticket.id, 'Reusing existing open ticket on repeated /premium execution (no duplicates)');

  // TEST 19: Cryptographic One-Time Bridge Token & Anti-Replay (Section 13, 30, 34)
  console.log('\n18. Single-Use Bridge Token & Anti-Replay:');
  const bridgeToken = SupportService.createBridgeToken(tgUser, ticket1.ticket.id, 'PREMIUM_SUPPORT');
  assert(typeof bridgeToken === 'string' && bridgeToken.length === 64, 'Generates 64-char cryptographically random bridge token');

  // First exchange (Success)
  const exchangeResult = await SupportService.exchangeBridgeToken(bridgeToken);
  assert(exchangeResult.userId === tgUser && exchangeResult.targetTicketId === ticket1.ticket.id, 'First-time exchange succeeds and validates user identity');

  // Replay attempt (Rejection)
  let replayError = false;
  try {
    await SupportService.exchangeBridgeToken(bridgeToken);
  } catch (e: any) {
    replayError = e.message.includes('ALREADY_USED') || e.message.includes('REPLAY') || e.message.includes('INVALID');
  }
  assert(replayError, 'Token replay rejected: single-use token cannot be redeemed twice');

  // TEST 20: User Support Ticket Isolation (Section 15 & 34)
  console.log('\n19. User Ticket Access Isolation:');
  const userA = tgUser;
  const userB = uuidv4();
  db.prepare("INSERT INTO users (id, telegram_id, status) VALUES (?, ?, 'ACTIVE')").run(userB, `tg-b-${userB.slice(0, 8)}`);
  const ticketB = SupportService.getOrCreatePremiumTicket(userB);

  // User A attempts to access User B's ticket
  let crossAccessDenied = false;
  try {
    SupportService.getUserTicketDetails(userA, ticketB.ticket.id);
  } catch (e: any) {
    crossAccessDenied = e.message.includes('UNAUTHORIZED') || e.message.includes('ACCESS_DENIED') || e.message.includes('tidak memiliki akses');
  }
  assert(crossAccessDenied, 'Cross-user ticket access denied: User A cannot read User B ticket');

  // User A accesses own ticket
  const userAOwnTicket = SupportService.getUserTicketDetails(userA, ticket1.ticket.id);
  assert(userAOwnTicket.ticket.id === ticket1.ticket.id, 'User A can securely access their own ticket');

  // TEST 21: Separation of Internal Moderator Notes from Customer Chat (Section 18)
  console.log('\n20. Internal Moderator Notes Separation:');
  // Admin posts public reply
  SupportService.sendMessage(ticket1.ticket.id, 'ADMIN', 'admin-support-1', 'Admin NIVA', 'Halo! Ada yang bisa kami bantu mengenai paket Premium?', false);
  // Admin posts private internal note
  SupportService.sendMessage(ticket1.ticket.id, 'ADMIN', 'admin-support-1', 'Admin NIVA', 'Catatan internal: user menanyakan opsi pembayaran via QRIS', true);

  // Customer fetches ticket
  const customerView = SupportService.getUserTicketDetails(userA, ticket1.ticket.id);
  assert(customerView.messages.some((m) => m.body.includes('Halo! Ada yang bisa')), 'Customer receives admin public reply');
  assert(!customerView.messages.some((m) => m.body.includes('Catatan internal')), 'Internal moderator notes are STRICTLY hidden from customer view');

  // Admin fetches ticket
  const adminView = SupportService.getAdminTicketDetails(ticket1.ticket.id);
  assert(adminView.messages.some((m) => m.body.includes('Catatan internal')), 'Internal notes remain visible to authorized administrators');

  // TEST 22: Append-Only Immutable Audit Log (Section 29)
  console.log('\n21. Append-Only Audit Logging:');
  const auditEntriesBefore = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };
  ModerationService.logAudit({
    actorId: 'admin-auditor-1',
    actorRole: 'SUPER_ADMIN',
    action: 'TEST_AUDIT_ACTION',
    targetResource: 'system_settings',
    targetId: 'setting-1',
    details: 'Testing append-only audit trail verification',
  });
  const auditEntriesAfter = db.prepare('SELECT COUNT(*) as count FROM audit_logs').get() as { count: number };
  assert(auditEntriesAfter.count === auditEntriesBefore.count + 1, 'Audit record appended successfully without schema tampering');

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
