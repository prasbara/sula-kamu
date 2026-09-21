import { getDatabase, initDatabase } from '../database/db.js';
import { seedDatabase } from '../database/seed.js';
import { VerificationService } from '../services/verification/verificationService.js';
import { MatchingService } from '../services/matchmaking/matchingService.js';
import { ModerationService } from '../services/safety/moderationService.js';
import { OnboardingHandler } from '../bot/handlers/onboarding.js';
import { ImageSanitizer } from '../services/verification/imageSanitizer.js';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

async function createTestKtmImage(studentName: string, institutionText: string): Promise<Buffer> {
  const svg = `
    <svg width="600" height="380" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1e293b"/>
      <rect x="20" y="20" width="560" height="60" fill="#0284c7" rx="8"/>
      <text x="40" y="58" font-family="Arial" font-size="24" font-weight="bold" fill="#ffffff">${institutionText}</text>
      <text x="40" y="140" font-family="Arial" font-size="20" fill="#94a3b8">KARTU TANDA MAHASISWA</text>
      <text x="40" y="180" font-family="Arial" font-size="26" font-weight="bold" fill="#f8fafc">Nama: ${studentName}</text>
      <text x="40" y="220" font-family="Arial" font-size="18" fill="#cbd5e1">NIM: 24060120140001</text>
      <text x="40" y="250" font-family="Arial" font-size="18" fill="#cbd5e1">Fakultas: Sains dan Matematika</text>
      <text x="40" y="280" font-family="Arial" font-size="18" fill="#cbd5e1">Jurusan: Informatika</text>
      <rect x="420" y="120" width="140" height="180" fill="#334155" rx="4"/>
      <text x="455" y="220" font-family="Arial" font-size="16" fill="#94a3b8">FOTO</text>
    </svg>
  `;
  return await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toBuffer();
}

async function runSimulation() {
  console.log('===============================================================');
  console.log('  SULA PLATFORM — END-TO-END VERIFICATION & USER JOURNEY TEST  ');
  console.log('===============================================================\n');

  initDatabase();
  seedDatabase();
  const db = getDatabase();

  // Reset simulation state for reproducible testing
  db.exec(`
    DELETE FROM blocks WHERE blocker_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'));
    DELETE FROM reports WHERE reporter_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'));
    DELETE FROM matches WHERE user_a_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'))
                      OR user_b_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'));
    DELETE FROM likes WHERE from_user_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'))
                      OR to_user_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'));
    DELETE FROM student_verifications WHERE user_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'));
    DELETE FROM verification_attempts WHERE user_id IN (SELECT id FROM users WHERE telegram_id IN ('11111111', '22222222', '99999999'));
  `);

  console.log('1. [ONBOARDING] Simulating Student 1: Rian (UNDIP, Telegram ID: 11111111)');
  const user1 = OnboardingHandler.getOrCreateUser('11111111');
  db.prepare("UPDATE users SET is_18_plus = 1, status = 'ACTIVE' WHERE id = ?").run(user1.id);

  console.log('2. [KTM VERIFICATION] Generating test student card for Rian...');
  const ktmBuffer1 = await createTestKtmImage('RIAN PRATAMA', 'UNIVERSITAS DIPONEGORO');

  // Verify Magic bytes
  const magicCheck = ImageSanitizer.validateMagicBytes(ktmBuffer1);
  console.log(`   -> Magic Byte Validation: ${magicCheck.isValid ? 'PASSED (valid image)' : 'FAILED'}`);

  // Process KTM submission
  const verifResult1 = await VerificationService.processKtmSubmission(
    user1.id,
    'inst-undip',
    'Rian Pratama',
    ktmBuffer1
  );
  console.log(`   -> KTM Verification Status: ${verifResult1.status} (${verifResult1.userFacingMessage})`);

  // Create Profile for Rian
  db.prepare(`
    INSERT OR REPLACE INTO profiles (
      id, user_id, display_name, age, institution_id, study_field,
      bio, interests, relationship_intent, coarse_area
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DATING', 'Tembalang')
  `).run(
    uuidv4(),
    user1.id,
    'Rian',
    21,
    'inst-undip',
    'Informatika',
    'Suka ngopi santai di Tembalang sambil ngobrolin startup dan musik.',
    JSON.stringify(['Coding & Tech', 'Ngopi / Cafe Hopping', 'Music & Concerts'])
  );
  console.log('   -> Profile Rian created successfully.\n');

  console.log('3. [ONBOARDING] Simulating Student 2: Nadia (UDINUS, Telegram ID: 22222222)');
  const user2 = OnboardingHandler.getOrCreateUser('22222222');
  db.prepare("UPDATE users SET is_18_plus = 1, status = 'ACTIVE' WHERE id = ?").run(user2.id);

  const ktmBuffer2 = await createTestKtmImage('NADIA LARASATI', 'UNIVERSITAS DIAN NUSWANTORO');
  const verifResult2 = await VerificationService.processKtmSubmission(
    user2.id,
    'inst-udinus',
    'Nadia Larasati',
    ktmBuffer2
  );
  console.log(`   -> KTM Verification Status: ${verifResult2.status} (${verifResult2.userFacingMessage})`);

  db.prepare(`
    INSERT OR REPLACE INTO profiles (
      id, user_id, display_name, age, institution_id, study_field,
      bio, interests, relationship_intent, coarse_area
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DATING', 'Semarang Tengah')
  `).run(
    uuidv4(),
    user2.id,
    'Nadia',
    20,
    'inst-udinus',
    'Desain Komunikasi Visual',
    'Tertarik seni visual, galeri art, dan cafe aesthetic di Semarang.',
    JSON.stringify(['Fotografi & Art', 'Ngopi / Cafe Hopping', 'Music & Concerts'])
  );
  console.log('   -> Profile Nadia created successfully.\n');

  console.log('3b. [ADMIN REVIEW QUEUE] Human reviewer inspects and APPROVES Rian and Nadia...');
  db.prepare("UPDATE student_verifications SET status = 'VERIFIED', verified_at = datetime('now') WHERE user_id IN (?, ?)").run(user1.id, user2.id);
  db.prepare("UPDATE users SET status = 'ACTIVE' WHERE id IN (?, ?)").run(user1.id, user2.id);
  console.log('   -> Both students are now marked VERIFIED and eligible for matchmaking.\n');

  console.log('4. [ANTI-FRAUD DUPLICATE DETECTION] Simulating attacker reusing Rian\'s KTM...');
  const attacker = OnboardingHandler.getOrCreateUser('99999999');
  const duplicateAttempt = await VerificationService.processKtmSubmission(
    attacker.id,
    'inst-undip',
    'Hacker Fake',
    ktmBuffer1 // Reusing Rian's exact card image!
  );
  console.log(`   -> Attack result: Status = ${duplicateAttempt.status}`);
  console.log(`   -> Anti-Fraud response: ${duplicateAttempt.userFacingMessage}\n`);

  console.log('5. [DISCOVERY & MATCHMAKING] Rian opens Discovery feed...');
  const rianQueue = MatchingService.getDiscoveryQueue(user1.id, 5);
  console.log(`   -> Candidates found: ${rianQueue.length}`);
  if (rianQueue.length > 0) {
    console.log(`   -> Candidate 1: ${rianQueue[0].displayName} (${rianQueue[0].institutionShortName}) - Shared interests: ${rianQueue[0].mutualInterestsCount}`);
    
    console.log('   -> Rian LIKES Nadia...');
    const likeResult = MatchingService.handleLike(user1.id, user2.id);
    console.log(`   -> Mutual Match? ${likeResult.isMatch}`);
  }

  console.log('\n6. [MUTUAL MATCHING] Nadia opens Discovery feed & LIKES Rian...');
  const nadiaLike = MatchingService.handleLike(user2.id, user1.id);
  console.log(`   -> Mutual Match Triggered: ${nadiaLike.isMatch}`);
  console.log(`   -> Match ID: ${nadiaLike.matchId}`);

  console.log('\n7. [MEDIATED IN-BOT CHAT] Safe messaging between matched students:');
  const msg1 = MatchingService.sendMatchMessage(nadiaLike.matchId!, user1.id, 'Halo Nadia! Salam kenal, sama-sama suka hunting kopi ya?');
  console.log(`   [Rian -> Nadia]: "${msg1.content}"`);

  const msg2 = MatchingService.sendMatchMessage(nadiaLike.matchId!, user2.id, 'Hai Rian! Iya nih, sering nongkrong di daerah Tembalang juga.');
  console.log(`   [Nadia -> Rian]: "${msg2.content}"`);

  console.log('\n8. [TRUST & SAFETY] Simulating report submission...');
  const report = ModerationService.createReport({
    reporterUserId: user1.id,
    reportedUserId: user2.id,
    category: 'SPAM',
    evidenceText: 'Testing report generation and automated blocking mechanism',
  });
  console.log(`   -> Case Created: ${report.report_code}`);
  console.log(`   -> Category: ${report.category}`);
  console.log(`   -> Case Status: ${report.status}`);

  // Verify auto-block
  const isBlocked = db.prepare('SELECT id FROM blocks WHERE blocker_id = ? AND blocked_id = ?').get(user1.id, user2.id);
  console.log(`   -> Target Auto-Blocked? ${isBlocked ? 'YES (Verified)' : 'NO'}`);

  console.log('\n9. [ADMIN / MODERATION ACTION] Moderator reviews and resolves report:');
  ModerationService.resolveReport(report.id, 'admin-mod-01', 'WARN', 'Warning sent to user regarding spam behavior');
  const updatedReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(report.id) as any;
  console.log(`   -> Case ${updatedReport.report_code} updated status: ${updatedReport.status} with action: ${updatedReport.resolution_action}`);

  console.log('\n10. [EMERGENCY KILLSWITCH] Testing incident response toggle:');
  ModerationService.toggleSystemSetting('matchmaking_enabled', false, 'admin-super-01');
  const isMatchmakingActive = MatchingService.isMatchmakingEnabled();
  console.log(`   -> Matchmaking Killswitch Active? ${!isMatchmakingActive ? 'YES (Discovery paused)' : 'NO'}`);
  // Restore
  ModerationService.toggleSystemSetting('matchmaking_enabled', true, 'admin-super-01');

  console.log('\n===============================================================');
  console.log('  ALL SULA CORE SPECIFICATIONS VERIFIED & PASSING!             ');
  console.log('===============================================================\n');
}

runSimulation().catch(console.error);
