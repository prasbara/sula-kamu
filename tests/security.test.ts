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
