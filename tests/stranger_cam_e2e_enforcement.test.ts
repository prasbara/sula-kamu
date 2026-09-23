import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDatabase } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { StrangerCamService, SignalBus } from '../src/services/stranger/strangerCamService';
import { FacePresenceDebouncer } from '../lib/facePresenceDetector';
import { VideoModerationEngine, VideoViolationPayload } from '../lib/videoModerationEngine';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'stranger_e2e_enforcement_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.STRANGER_CAM_ENABLED = 'true';

async function runE2EEnforcementTests() {
  console.log('====================================================================');
  console.log('    NIVA STRANGER CAM — E2E PRODUCTION AUDIT & ENFORCEMENT SUITE    ');
  console.log('====================================================================\n');

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  initDatabase(TEST_DB_PATH);
  seedDatabase(TEST_DB_PATH);
  const db = getDatabase(TEST_DB_PATH);

  // Clear tables
  db.prepare('DELETE FROM stranger_queue').run();
  db.prepare('DELETE FROM stranger_signals').run();
  db.prepare('DELETE FROM stranger_sessions').run();
  db.prepare('DELETE FROM stranger_skips').run();
  db.prepare('DELETE FROM stranger_blocks').run();
  db.prepare('DELETE FROM stranger_presence').run();
  db.prepare('DELETE FROM user_restrictions').run();
  db.prepare('DELETE FROM moderation_events').run();
  db.prepare('DELETE FROM support_tickets').run();
  db.prepare('DELETE FROM audit_logs').run();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, description: string) {
    if (condition) {
      console.log(`  [PASS] ${description}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${description}`);
      failed++;
    }
  }

  function createTestUser(name: string, is18Plus = 1, modStatus = 'ACTIVE'): string {
    const userId = uuidv4();
    const telegramId = Math.floor(100000000 + Math.random() * 900000000);
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, moderation_status, is_18_plus, verification_status, subscription_status, environment, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', ?, ?, 'UNVERIFIED', 'FREE', 'DEVELOPMENT', datetime('now'), datetime('now'))
    `).run(userId, telegramId, modStatus, is18Plus);

    const profileId = uuidv4();
    db.prepare(`
      INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field, bio, interests, relationship_intent, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 21, 'inst-undip', 'Informatika', 'Mahasiswa Semarang', '["Coding"]', 'NEW_FRIENDS', 1, datetime('now'), datetime('now'))
    `).run(profileId, userId, name);

    StrangerCamService.confirmSemarangLocation(userId, 'BROWSER_GEO', {
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 10,
    });
    return userId;
  }

  // ── TEST A: Normal Camera & Peer Connection Flow ─────────────────────────
  console.log('1. Test A: Normal Camera Matchmaking & WebRTC Session');
  const userA = createTestUser('Alice');
  const userB = createTestUser('Bob');

  const joinA = StrangerCamService.joinQueue(userA);
  assert(joinA.status === 'QUEUED', 'User A joined queue in QUEUED status');

  const joinB = StrangerCamService.joinQueue(userB);
  assert(joinB.status === 'CONNECTED' && !!joinB.session, 'User B matched with User A and session created');

  const sessionId = joinB.session.id;
  const sessionInfo = StrangerCamService.getSessionInfo(sessionId, userA);
  assert(sessionInfo.status === 'CONNECTED', 'WebRTC session state is CONNECTED');

  // Verify WebRTC signaling message exchange
  const offerPayload = JSON.stringify({ type: 'offer', sdp: 'v=0...' });
  const sendRes = StrangerCamService.sendSignal(sessionId, userA, 'OFFER', offerPayload);
  assert(sendRes.success === true, 'WebRTC OFFER signal dispatched successfully');

  const signalsForB = StrangerCamService.getSignals(sessionId, userB);
  assert(signalsForB.length === 1 && signalsForB[0].signalType === 'OFFER', 'WebRTC offer signal delivered to peer B');

  // ── TEST B: Camera Failure / Ineligibility Pre-checks ─────────────────────
  console.log('\n2. Test B: Camera Failure / Ineligibility Pre-checks');
  const underageUser = createTestUser('UnderageUser', 0);
  const eligUnderage = StrangerCamService.checkEligibility(underageUser);
  assert(!eligUnderage.eligible && eligUnderage.requiresAge === true, 'Server rejects underage users before matchmaking');

  const unconfirmedUser = uuidv4();
  db.prepare(`
    INSERT INTO users (id, telegram_id, status, moderation_status, is_18_plus, verification_status, subscription_status, environment, created_at, updated_at)
    VALUES (?, ?, 'ACTIVE', 'ACTIVE', 1, 'UNVERIFIED', 'FREE', 'DEVELOPMENT', datetime('now'), datetime('now'))
  `).run(unconfirmedUser, 99999999);
  const eligNoLoc = StrangerCamService.checkEligibility(unconfirmedUser);
  assert(!eligNoLoc.eligible && eligNoLoc.requiresLocation === true, 'Server rejects users without verified Semarang location');

  // ── TEST C: Peer Disconnect & Controlled Cleanup ─────────────────────────
  console.log('\n3. Test C: Peer Disconnect & Controlled Cleanup');
  let peerNotified = false;
  const unsubscribe = SignalBus.subscribe(sessionId, userB, (signal) => {
    if (signal.payload && signal.payload.includes('PEER_LEFT')) {
      peerNotified = true;
    }
  });

  StrangerCamService.skipCall(sessionId, userA);
  const sessionAfterEnd: any = db.prepare('SELECT status, end_reason FROM stranger_sessions WHERE id = ?').get(sessionId);
  assert(sessionAfterEnd?.status === 'SKIPPED', 'Session correctly transitioned to SKIPPED state');
  assert(sessionAfterEnd?.end_reason.includes('SKIPPED_BY_'), 'Ended reason is recorded correctly');
  assert(peerNotified, 'SignalBus notified the peer immediately about disconnection');
  unsubscribe();

  // ── TEST D: No-Face Enforcement (Absence Timeout -> Ticket) ──────────────
  console.log('\n4. Test D: No-Face Enforcement (Face Absence -> Restriction -> Ticket)');
  const userC = createTestUser('Charlie');
  const userD = createTestUser('David');
  StrangerCamService.joinQueue(userC);
  const matchCD = StrangerCamService.joinQueue(userD);
  const sessionCD = matchCD.session.id;

  // Simulate client-side face debouncer with 1s grace period
  const debouncer = new FacePresenceDebouncer(0.05); // fast 50ms for test
  const missingResult = { status: 'FACE_MISSING' as const, faceCount: 0, confidence: 0.9, isLowLight: false };

  // Tick 1: enters grace period
  const tick1 = debouncer.update(missingResult);
  assert(tick1.state === 'IN_GRACE_PERIOD', 'Debouncer starts in IN_GRACE_PERIOD');

  // Wait 60ms to exceed grace period, and perform 3 ticks
  await new Promise((resolve) => setTimeout(resolve, 60));
  debouncer.update(missingResult);
  const tick3 = debouncer.update(missingResult);
  assert(tick3.state === 'ENFORCEMENT_REQUIRED', 'Debouncer transitioned to ENFORCEMENT_REQUIRED after grace period and consecutive ticks');

  // Trigger server-side enforcement
  const enforceFace = StrangerCamService.enforceModerationViolation({
    userId: userC,
    sessionId: sessionCD,
    violationType: 'FACE_NOT_VISIBLE',
    severity: 'MEDIUM',
    detectionConfidence: 0.95,
    automatedAction: 'RESTRICT_USER',
    reason: 'Wajah tidak terdeteksi melebihi batas waktu (6 detik)',
    detectionMetadata: { absentDurationMs: 6200, checksPerformed: 6 },
  });

  assert(enforceFace.success, 'Face absent enforcement processed successfully');
  assert(!!enforceFace.ticketId, `Support ticket created: ${enforceFace.ticketId}`);

  // Verify DB state for User C
  const userCRecord: any = db.prepare('SELECT moderation_status FROM users WHERE id = ?').get(userC);
  assert(userCRecord.moderation_status === 'RESTRICTED', 'User C moderation_status updated to RESTRICTED in database');

  // Verify ticket in DB
  const ticketFace: any = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(enforceFace.ticketId);
  assert(ticketFace !== undefined, 'Ticket exists in support_tickets table');
  assert(ticketFace.violation_type === 'FACE_NOT_VISIBLE', 'Ticket records correct violation_type');
  assert(ticketFace.user_id === userC, 'Ticket linked to user_id');
  assert(ticketFace.session_id === sessionCD, 'Ticket linked to session_id');

  // Verify session CD was terminated
  const sessionCDState: any = db.prepare('SELECT status FROM stranger_sessions WHERE id = ?').get(sessionCD);
  assert(sessionCDState?.status === 'ENDED', 'Stranger Cam session ended immediately upon face violation');

  // ── TEST E: Explicit Behavior Moderation Engine & Enforcement ────────────
  console.log('\n5. Test E: Explicit Sexual Behavior Moderation Engine');
  let violationPayload: VideoViolationPayload | null = null;
  const modEngine = new VideoModerationEngine({
    confidenceThreshold: 0.85,
    consecutiveRequired: 3,
    onEnforce: (v) => {
      violationPayload = v;
    },
  });

  // Frame 1: High confidence -> state changes to SUSPECTED (no enforcement yet!)
  const state1 = modEngine.processEvaluation(0.90, 0.70, 0.65, false);
  assert(state1.state === 'SUSPECTED', 'Single explicit frame changes state to SUSPECTED without premature enforcement');

  // Frame 2: High confidence -> SUSPECTED
  const state2 = modEngine.processEvaluation(0.92, 0.72, 0.70, false);
  assert(state2.state === 'SUSPECTED', 'Second frame keeps state at SUSPECTED');

  // Frame 3: Consecutive hit 3 -> CONFIRMED & ENFORCED
  const state3 = modEngine.processEvaluation(0.95, 0.78, 0.75, false);
  assert(state3.state === 'ENFORCED' && violationPayload !== null, 'Third consecutive high confidence frame triggers ENFORCED and onEnforce callback');

  // Server-side enforcement for Explicit Content
  const userE = createTestUser('Eve');
  const userF = createTestUser('Frank');
  StrangerCamService.joinQueue(userE);
  const matchEF = StrangerCamService.joinQueue(userF);
  const sessionEF = matchEF.session.id;

  const enforceExplicit = StrangerCamService.enforceModerationViolation({
    userId: userE,
    sessionId: sessionEF,
    violationType: 'EXPLICIT_BEHAVIOR',
    severity: 'CRITICAL',
    detectionConfidence: 0.95,
    automatedAction: 'RESTRICT_USER',
    reason: 'Deteksi aktivitas visual eksplisit konsisten (3 frame berturut-turut conf: 0.95)',
    detectionMetadata: { consecutiveHits: 3, skinRatio: 0.78, samplesAnalyzed: 12 },
  });

  assert(enforceExplicit.success, 'Explicit content violation enforced successfully');
  const ticketExplicit: any = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(enforceExplicit.ticketId);
  assert(ticketExplicit.priority === 'URGENT', 'Explicit content ticket created with URGENT priority in support_tickets');

  const restrictionRecord: any = db.prepare('SELECT * FROM user_restrictions WHERE user_id = ? AND restriction_type = ?').get(userE, 'CAM_RESTRICTED');
  assert(restrictionRecord !== undefined, 'User restriction record created in user_restrictions table');

  // ── TEST F: False Positive Protection ────────────────────────────────────
  console.log('\n6. Test F: False Positive Protection (Fluctuation & Decay)');
  const modEngineFP = new VideoModerationEngine({
    confidenceThreshold: 0.85,
    consecutiveRequired: 3,
  });

  // Fleeting frame followed by normal frames
  const fp1 = modEngineFP.processEvaluation(0.91, 0.60, 0.60, false);
  assert(fp1.state === 'SUSPECTED', 'One anomalous frame is marked SUSPECTED');
  modEngineFP.processEvaluation(0.10, 0.15, 0.10, true); // Normal
  const fp3 = modEngineFP.processEvaluation(0.12, 0.12, 0.10, true); // Normal
  assert(fp3.state === 'NORMAL', 'State decayed back to NORMAL after benign frames (no false alarm)');

  // ── TEST G: Admin Ticket Resolution & Audit Logging ──────────────────────
  console.log('\n7. Test G: Admin Ticket Resolution & Audit Logging');
  const adminTickets = StrangerCamService.getAdminModerationTickets();
  assert(adminTickets.length >= 2, `Admin query returned ${adminTickets.length} moderation tickets from DB`);

  const foundTicket = adminTickets.find((t) => t.ticketId === enforceFace.ticketId);
  assert(foundTicket !== undefined, 'Admin dashboard query finds Face Absent ticket');

  // Admin resolves Face Absent as FALSE_POSITIVE
  const resolveResult = StrangerCamService.resolveModerationTicket(
    enforceFace.ticketId,
    'FALSE_POSITIVE',
    'admin_super',
    'Pengguna hanya menunduk mengambil pulpen, wajah kembali terlihat'
  );

  assert(resolveResult.success, 'Admin resolved ticket as FALSE_POSITIVE');

  // Verify user C was restored to ACTIVE
  const userCRestored: any = db.prepare('SELECT moderation_status FROM users WHERE id = ?').get(userC);
  assert(userCRestored.moderation_status === 'ACTIVE', 'User C moderation_status successfully restored to ACTIVE');

  // Verify audit log recorded
  const auditEntry: any = db.prepare('SELECT * FROM audit_logs WHERE target_id = ? AND action = ?').get(enforceFace.ticketId, 'MODERATION_FALSE_POSITIVE_DISMISSED');
  assert(auditEntry !== undefined, 'Audit log recorded for ticket resolution with admin ID');

  // ── TEST H: Anti-Bypass Validation (Server-Side Restriction Check) ───────
  console.log('\n8. Test H: Anti-Bypass Validation (Restricted User Blocked)');
  // User E is still RESTRICTED from Test E
  const eligUserE = StrangerCamService.checkEligibility(userE);
  assert(!eligUserE.eligible, 'Server-side checkEligibility rejects restricted user E');
  assert(eligUserE.reason?.includes('dibatasi'), 'Rejection reason indicates restricted access');

  // Attempting to join queue anyway
  const bypassQueueAttempt = StrangerCamService.joinQueue(userE);
  assert(!bypassQueueAttempt.success, 'Restricted user is rejected when attempting to join queue');
  assert(bypassQueueAttempt.status === 'INELIGIBLE', 'Queue join returns INELIGIBLE status for restricted user');

  // ── TEST I: Database Production Stats Verification ────────────────────────
  console.log('\n9. Test I: Genuine Database Counters');
  const dbStats = StrangerCamService.getDatabaseStats();
  assert(typeof dbStats.usersOnline === 'number', 'usersOnline is a real number from DB');
  assert(typeof dbStats.completedSessions === 'number' && dbStats.completedSessions >= 2, 'completedSessions reflects real completed sessions');
  assert(typeof dbStats.activeModerationCases === 'number' && dbStats.activeModerationCases >= 1, 'activeModerationCases reflects pending/open tickets in DB');

  console.log('\n====================================================================');
  console.log(`    E2E ENFORCEMENT TEST RESULTS: ${passed} PASSED / ${failed} FAILED    `);
  console.log('====================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2EEnforcementTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
