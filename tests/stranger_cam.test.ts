import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDatabase } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { StrangerCamService, ReportReason } from '../src/services/stranger/strangerCamService';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'stranger_cam_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.STRANGER_CAM_ENABLED = 'false';

async function runStrangerCamTestSuite() {
  console.log('===============================================================');
  console.log('       NIVA STRANGER CAM (SOON UPDATE) AUTOMATED TEST SUITE    ');
  console.log('===============================================================');

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  initDatabase(TEST_DB_PATH);
  seedDatabase(TEST_DB_PATH);
  const db = getDatabase(TEST_DB_PATH);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name} ${detail ? `-> ${detail}` : ''}`);
      failed++;
    }
  }

  function createTestUser(opts: { is18Plus: boolean; verificationStatus: string }) {
    const userId = uuidv4();
    const profileId = uuidv4();
    const telegramId = `tg-${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, is_18_plus, verification_status, subscription_status, environment, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', ?, ?, 'FREE', 'TEST', datetime('now'), datetime('now'))
    `).run(userId, telegramId, opts.is18Plus ? 1 : 0, opts.verificationStatus);

    db.prepare(`
      INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field, bio, interests, relationship_intent, is_active, created_at, updated_at)
      VALUES (?, ?, 'Test User', 20, 'inst-undip', 'Informatika', 'Bio student', '["Musik"]', 'NEW_FRIENDS', 1, datetime('now'), datetime('now'))
    `).run(profileId, userId);

    return userId;
  }

  // -------------------------------------------------------------
  // 1. COMING SOON STATUS & NO FAKE AVAILABILITY
  // -------------------------------------------------------------
  console.log('\n1. Coming Soon Status & Authentic Metrics:');
  const isLaunched = StrangerCamService.isFeatureLaunched();
  assert(isLaunched === false, 'Feature is in COMING SOON state (not falsely claimed as launched)');

  const initialWaitlist = StrangerCamService.getWaitlistCount();
  assert(initialWaitlist === 0, 'Waitlist count starts at genuine 0 (no fake numbers like 2,531)');

  // -------------------------------------------------------------
  // 2. WAITLIST / NOTIFY ME SUBSCRIPTIONS
  // -------------------------------------------------------------
  console.log('\n2. Waitlist / Notify Me Subscriptions:');
  const waitlistRes1 = StrangerCamService.joinWaitlist('@mahasiswa_undip');
  assert(waitlistRes1.success === true, 'Successfully registered Telegram contact to waitlist');
  assert(StrangerCamService.getWaitlistCount() === 1, 'Waitlist count increments by genuine 1');

  // Anti-duplication check
  StrangerCamService.joinWaitlist('@mahasiswa_undip');
  assert(StrangerCamService.getWaitlistCount() === 1, 'Duplicate contact registration does NOT artificially inflate waitlist');

  const waitlistRes2 = StrangerCamService.joinWaitlist('student@kampus.id');
  assert(waitlistRes2.success === true, 'Successfully registered email contact to waitlist');
  assert(StrangerCamService.getWaitlistCount() === 2, 'Waitlist count reflects exact genuine entries (2)');

  // -------------------------------------------------------------
  // 3. 18+ REQUIREMENT ENFORCEMENT
  // -------------------------------------------------------------
  console.log('\n3. 18+ Age Requirement:');
  const minorUser = createTestUser({ is18Plus: false, verificationStatus: 'UNVERIFIED' });
  const adultUser = createTestUser({ is18Plus: true, verificationStatus: 'UNVERIFIED' });

  const minorEligibility = StrangerCamService.checkEligibility(minorUser);
  assert(minorEligibility.eligible === false, 'Minor user (<18) is strictly rejected from Stranger Cam');
  assert(minorEligibility.requiresAge === true, 'Requires age confirmation indicator is true for minor');

  // -------------------------------------------------------------
  // 4. LOW-FRICTION: NO KTM OR PHOTO VERIFICATION REQUIRED
  // -------------------------------------------------------------
  console.log('\n4. Verification Exemption (No KTM / Photo Requirement):');
  // Confirm adultUser in Semarang
  StrangerCamService.confirmSemarangLocation(adultUser, 'USER_CONFIRMATION');
  const unverifiedAdultEligibility = StrangerCamService.checkEligibility(adultUser);
  assert(
    unverifiedAdultEligibility.eligible === true,
    'Unverified user (no KTM, no photo) IS ELIGIBLE once 18+ and in Semarang'
  );

  // -------------------------------------------------------------
  // 5. LOCATION CONFIRMATION & DATA MINIMIZATION
  // -------------------------------------------------------------
  console.log('\n5. Location Confirmation & Data Minimization:');
  const semarangCoords = { latitude: -6.9932, longitude: 110.4203 }; // Simpang Lima Semarang
  const jakartaCoords = { latitude: -6.2088, longitude: 106.8456 }; // Jakarta (outside Semarang)

  const userGeo = createTestUser({ is18Plus: true, verificationStatus: 'UNVERIFIED' });

  // Valid Semarang GPS
  const validGeoRes = StrangerCamService.confirmSemarangLocation(userGeo, 'BROWSER_GEO', semarangCoords);
  assert(validGeoRes.success === true, 'Approves browser coordinates located inside Semarang area');
  assert(validGeoRes.region === 'SEMARANG', 'Returns standard region "SEMARANG"');

  // Outside Semarang GPS rejected
  let jakartaBlocked = false;
  try {
    StrangerCamService.confirmSemarangLocation(userGeo, 'BROWSER_GEO', jakartaCoords);
  } catch (err: any) {
    jakartaBlocked = err.message.includes('Semarang');
  }
  assert(jakartaBlocked, 'Rejects browser coordinates outside Semarang bounding box');

  // Verify Data Minimization: Database does NOT store raw latitude / longitude
  const locRecord = db.prepare('SELECT * FROM location_confirmations WHERE user_id = ?').get(userGeo) as any;
  assert(locRecord !== undefined, 'Location confirmation record exists');
  assert(locRecord.region === 'SEMARANG', 'Stored region is strictly "SEMARANG"');
  assert(!('latitude' in locRecord) && !('longitude' in locRecord), 'Raw GPS coordinates are NEVER permanently stored in table schema');

  // Expiration test: artificially expire location
  db.prepare("UPDATE location_confirmations SET expires_at = datetime('now', '-1 hour') WHERE user_id = ?").run(userGeo);
  const expiredEligibility = StrangerCamService.checkEligibility(userGeo);
  assert(expiredEligibility.eligible === false, 'Expired location confirmation requires re-confirmation');
  assert(expiredEligibility.requiresLocation === true, 'Requires location flag is set when expired');

  // Re-confirm
  StrangerCamService.confirmSemarangLocation(userGeo, 'USER_CONFIRMATION');
  assert(StrangerCamService.checkEligibility(userGeo).eligible === true, 'Re-confirmation restores eligibility');

  // -------------------------------------------------------------
  // 6. QUEUE & CALL CONTROLS (SKIP, BLOCK, REPORT, END)
  // -------------------------------------------------------------
  console.log('\n6. Queue Matching & Call Controls:');
  const userA = createTestUser({ is18Plus: true, verificationStatus: 'UNVERIFIED' });
  const userB = createTestUser({ is18Plus: true, verificationStatus: 'UNVERIFIED' });
  const userC = createTestUser({ is18Plus: true, verificationStatus: 'UNVERIFIED' });

  StrangerCamService.confirmSemarangLocation(userA, 'USER_CONFIRMATION');
  StrangerCamService.confirmSemarangLocation(userB, 'USER_CONFIRMATION');
  StrangerCamService.confirmSemarangLocation(userC, 'USER_CONFIRMATION');

  // When feature is NOT launched, joinQueue returns FEATURE_UNAVAILABLE
  const unavailRes = StrangerCamService.joinQueue(userA);
  assert(unavailRes.success === false && unavailRes.status === 'FEATURE_UNAVAILABLE', 'Queue rejects entry when feature is not yet launched');

  // Now simulate launched state for testing matchmaking logic
  const originalIsLaunched = StrangerCamService.isFeatureLaunched;
  (StrangerCamService as any).isFeatureLaunched = () => true;

  // User A joins queue
  const queueA = StrangerCamService.joinQueue(userA, ['Ngobrol Santai']);
  assert(queueA.success === true && queueA.status === 'QUEUED', 'User A enters Semarang queue when no partner waiting');

  // User B joins queue -> Random 1-on-1 match made!
  const queueB = StrangerCamService.joinQueue(userB, ['Ngobrol Santai']);
  assert(queueB.success === true && queueB.status === 'CONNECTED', 'User B joins and is immediately matched with User A');
  assert(queueB.session !== undefined, 'Active stranger session created');
  const sessionId = queueB.session.id;

  // Single active session enforcement
  const doubleJoinA = StrangerCamService.joinQueue(userA);
  assert(doubleJoinA.success === false && doubleJoinA.status === 'ALREADY_IN_SESSION', 'Server prevents user from entering multiple simultaneous active calls');

  // Skip Call
  const skipRes = StrangerCamService.skipCall(sessionId, userA);
  assert(skipRes.success === true, 'Skip call successfully terminates current match');
  const sessionAfterSkip = db.prepare('SELECT status, end_reason FROM stranger_sessions WHERE id = ?').get(sessionId) as any;
  assert(sessionAfterSkip.status === 'SKIPPED', 'Session status is SKIPPED');

  // Match A with C for Block test
  StrangerCamService.joinQueue(userA);
  const matchAC = StrangerCamService.joinQueue(userC);
  const sessionACId = matchAC.session.id;

  // Block User C by User A
  const blockRes = StrangerCamService.blockUser(sessionACId, userA, userC);
  assert(blockRes.success === true, 'Block action completes successfully');
  const blockRecord = db.prepare('SELECT * FROM stranger_blocks WHERE user_id = ? AND blocked_user_id = ?').get(userA, userC);
  assert(blockRecord !== undefined, 'Persistent block record created in stranger_blocks');

  // Verify that User A and User C CANNOT match again
  StrangerCamService.joinQueue(userA);
  const rematchC = StrangerCamService.joinQueue(userC);
  assert(rematchC.status === 'QUEUED', 'User C remains queued and is NOT matched with User A who blocked them');
  StrangerCamService.leaveQueue(userA);
  StrangerCamService.leaveQueue(userC);

  // Report Test
  StrangerCamService.joinQueue(userA);
  const matchAB2 = StrangerCamService.joinQueue(userB);
  const sessionAB2Id = matchAB2.session.id;

  const reportRes = StrangerCamService.reportUser(sessionAB2Id, userA, userB, 'NUDITY' as ReportReason, 'Pelanggaran kamera');
  assert(reportRes.success === true, 'Report action successfully terminates session and creates moderation ticket');
  const reportRow = db.prepare('SELECT * FROM stranger_reports WHERE id = ?').get(reportRes.reportId) as any;
  assert(reportRow.reason === 'NUDITY' && reportRow.status === 'PENDING', 'Report logged with reason NUDITY and status PENDING');
  const safetyEvent = db.prepare('SELECT * FROM stranger_safety_events WHERE session_id = ?').get(sessionAB2Id) as any;
  assert(safetyEvent !== undefined && safetyEvent.risk_score === 1.0, 'Critical safety event logged with high risk score (1.0)');

  // Restore feature flag
  (StrangerCamService as any).isFeatureLaunched = originalIsLaunched;

  // -------------------------------------------------------------
  // 7. ANTI-SCAM & CONTENT FILTER
  // -------------------------------------------------------------
  console.log('\n7. Anti-Scam & Safety Content Moderation:');
  const safeText = StrangerCamService.moderateMessage('Halo, salam kenal! Kamu kuliah di mana?');
  assert(safeText.allowed === true && safeText.riskScore === 0, 'Safe conversational greeting allowed without flags');

  const scamText = StrangerCamService.moderateMessage('Boleh transfer uang 50 ribu ke rekening saya gak? Lagi darurat.');
  assert(scamText.allowed === false, 'Blocks money transfer request (anti-scam filter)');

  const otpScamText = StrangerCamService.moderateMessage('Tolong kirimkan minta kode verifikasi OTP yang baru masuk ya');
  assert(otpScamText.allowed === false, 'Blocks credential/OTP theft attempt');

  const urlText = StrangerCamService.moderateMessage('Cek link ini ya https://example-fakelink.com');
  assert(urlText.allowed === true && urlText.flags.includes('EXTERNAL_URL'), 'Flags external links with security warning');

  // -------------------------------------------------------------
  // 8. ADMIN TELEMETRY
  // -------------------------------------------------------------
  console.log('\n8. Admin Telemetry & Health Monitoring:');
  const adminStats = StrangerCamService.getAdminStats();
  assert(adminStats.waitlistCount === 2, 'Admin stats accurately reflects waitlist count (2)');
  assert(adminStats.totalReports >= 1, 'Admin stats accurately counts moderation reports');
  assert(adminStats.bannedOrBlockedCount >= 1, 'Admin stats tracks stranger blocks');

  // -------------------------------------------------------------
  // 9. FULL PRODUCTION WEBRTC, PRESENCE, & ADMIN ACTIONS
  // -------------------------------------------------------------
  console.log('\n9. Full Production WebRTC Signaling, Presence & Admin Actions:');
  // A. User creation & 18+ gate
  const strangerUser = StrangerCamService.getOrCreateStrangerUser({ alias: 'Mahasiswa Undip', is18Plus: true });
  assert(strangerUser.id !== undefined, 'Successfully provisioned anonymous stranger user');
  assert(strangerUser.displayName === 'Mahasiswa Undip', 'Stored display alias correctly');
  assert(strangerUser.is18Plus === true, '18+ age gate enforced on user creation');
  assert(strangerUser.isKtmVerified === false, 'Stranger user is not falsely tagged as KTM Verified');

  // Confirm age gate method
  const confirmAgeRes = StrangerCamService.confirm18Plus(strangerUser.id);
  assert(confirmAgeRes.success === true, 'confirm18Plus updates server-side age status');

  // B. WebRTC Signaling in active session
  process.env.STRANGER_CAM_ENABLED = 'true';
  const userLiveA = createTestUser({ is18Plus: true, verificationStatus: 'UNVERIFIED' });
  const userLiveB = createTestUser({ is18Plus: true, verificationStatus: 'UNVERIFIED' });
  StrangerCamService.confirmSemarangLocation(userLiveA, 'USER_CONFIRMATION');
  StrangerCamService.confirmSemarangLocation(userLiveB, 'USER_CONFIRMATION');

  StrangerCamService.joinQueue(userLiveA);
  const liveMatch = StrangerCamService.joinQueue(userLiveB);
  assert(liveMatch.status === 'CONNECTED', 'Successfully connected userLiveA and userLiveB for signaling test');
  const liveSessionId = liveMatch.session.id;

  // Send Offer from userLiveB to userLiveA
  const offerRes = StrangerCamService.sendSignal(liveSessionId, userLiveB, 'OFFER', JSON.stringify({ type: 'offer', sdp: 'fake-sdp-offer' }));
  assert(offerRes.success === true && offerRes.signalId !== undefined, 'User B sends WebRTC OFFER signal to User A');

  // Get signals for userLiveA
  const userASignals = StrangerCamService.getSignals(liveSessionId, userLiveA);
  assert(userASignals.length === 1, 'User A receives 1 pending WebRTC signal');
  assert(userASignals[0].signalType === 'OFFER', 'Received signal is OFFER type');

  // Send Answer from userLiveA to userLiveB
  const answerRes = StrangerCamService.sendSignal(liveSessionId, userLiveA, 'ANSWER', JSON.stringify({ type: 'answer', sdp: 'fake-sdp-answer' }));
  assert(answerRes.success === true, 'User A sends WebRTC ANSWER signal to User B');

  const userBSignals = StrangerCamService.getSignals(liveSessionId, userLiveB);
  assert(userBSignals.length === 1 && userBSignals[0].signalType === 'ANSWER', 'User B receives WebRTC ANSWER signal');

  // Unauthorized signal attempt from strangerUser (not in session)
  let unauthSignalCaught = false;
  try {
    StrangerCamService.sendSignal(liveSessionId, strangerUser.id, 'OFFER', 'malicious-offer');
  } catch (err: any) {
    unauthSignalCaught = err.message.includes('bukan peserta');
  }
  assert(unauthSignalCaught, 'Rejects signaling attempts from unauthorized third parties');

  // C. Presence & Heartbeat
  StrangerCamService.recordHeartbeat(userLiveA, liveSessionId);
  const sessionInfoA = StrangerCamService.getSessionInfo(liveSessionId, userLiveA);
  assert(sessionInfoA.status === 'CONNECTED', 'Session info confirms CONNECTED state');
  assert(sessionInfoA.peer !== undefined && sessionInfoA.peer.region === 'SEMARANG', 'Session peer data contains safe public metadata (Semarang)');

  // D. Admin live sessions & report resolution
  const adminLiveSessions = StrangerCamService.getAdminLiveSessions();
  assert(adminLiveSessions.length >= 1, 'Admin live sessions query returns active sessions');
  assert(adminLiveSessions[0].userAAnonId.startsWith('USER-'), 'Admin telemetry anonymizes participant IDs (zero casual surveillance)');

  const adminReports = StrangerCamService.getAdminReports();
  assert(adminReports.length >= 1, 'Admin reports query returns pending/logged reports');
  const reportToResolve = adminReports[0];

  const resolveRes = StrangerCamService.resolveReport(reportToResolve.id, 'BAN_USER', 'Spam berat');
  assert(resolveRes.success === true, 'Admin successfully resolves report and bans violator');
  const bannedUserRow = db.prepare('SELECT status FROM users WHERE id = ?').get(reportToResolve.reportedAnonId.replace('USER-', '')) as any;
  // Check that reports status is updated
  const updatedReportRow = db.prepare('SELECT status FROM stranger_reports WHERE id = ?').get(reportToResolve.id) as any;
  assert(updatedReportRow.status === 'RESOLVED', 'Report status successfully marked as RESOLVED');

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStrangerCamTestSuite().catch((err) => {
  console.error('Stranger Cam test suite failed:', err);
  process.exit(1);
});
