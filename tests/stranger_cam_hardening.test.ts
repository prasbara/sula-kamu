import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDatabase } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { StrangerCamService, SignalBus } from '../src/services/stranger/strangerCamService';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'stranger_hardening_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.STRANGER_CAM_ENABLED = 'true';

async function runHardeningTests() {
  console.log('===============================================================');
  console.log('    NIVA STRANGER CAM — PRODUCTION HARDENING & CONCURRENCY     ');
  console.log('===============================================================\n');

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  initDatabase(TEST_DB_PATH);
  seedDatabase(TEST_DB_PATH);
  const db = getDatabase(TEST_DB_PATH);

  // Clean tables for test run
  db.prepare('DELETE FROM stranger_queue').run();
  db.prepare('DELETE FROM stranger_signals').run();
  db.prepare('DELETE FROM stranger_sessions').run();
  db.prepare('DELETE FROM stranger_skips').run();
  db.prepare('DELETE FROM stranger_blocks').run();
  db.prepare('DELETE FROM stranger_presence').run();

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

  function createTestUser(name: string): string {
    const userId = uuidv4();
    const telegramId = Math.floor(100000000 + Math.random() * 900000000);
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, is_18_plus, verification_status, subscription_status, environment, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', 1, 'UNVERIFIED', 'FREE', 'DEVELOPMENT', datetime('now'), datetime('now'))
    `).run(userId, telegramId);

    const profileId = uuidv4();
    db.prepare(`
      INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field, bio, interests, relationship_intent, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 21, 'inst-undip', 'Teknik', 'Mahasiswa Semarang', '["Ngobrol"]', 'NEW_FRIENDS', 1, datetime('now'), datetime('now'))
    `).run(profileId, userId, name);

    StrangerCamService.confirmSemarangLocation(userId, 'USER_CONFIRMATION');
    return userId;
  }

  // ── TEST SUITE 1: 50 Concurrent Queue Joins (Atomic Matchmaking) ─────────
  console.log('1. High-Concurrency Queue Matching (50 Simultaneous Users):');
  const userCount = 50;
  const testUsers: string[] = [];

  for (let i = 0; i < userCount; i++) {
    testUsers.push(createTestUser(`User_${i}`));
  }

  // All 50 join simultaneously
  const results = await Promise.all(
    testUsers.map((uid) => StrangerCamService.joinQueue(uid, ['Chat', 'Semarang']))
  );

  const matchedResults = results.filter((r) => r.status === 'CONNECTED' && r.session);
  const queuedResults = results.filter((r) => r.status === 'QUEUED');

  assert(
    matchedResults.length === userCount / 2,
    `25 join calls returned CONNECTED with session (${matchedResults.length}/${userCount / 2})`
  );
  assert(
    queuedResults.length === userCount / 2,
    `25 join calls entered queue and were matched atomically (${queuedResults.length}/${userCount / 2})`
  );

  // Verify unique sessions and participants
  const sessionIds = new Set(matchedResults.map((r) => r.session!.id));
  assert(sessionIds.size === userCount / 2, `Exactly 25 unique match sessions created (${sessionIds.size})`);

  // Verify no self-matches and every user is strictly in 1 session
  const userSessionMap = new Map<string, string>();
  let hasSelfMatch = false;

  for (const r of matchedResults) {
    const s = r.session!;
    if (s.user_a_id === s.user_b_id) {
      hasSelfMatch = true;
    }
    userSessionMap.set(s.user_a_id, s.id);
    userSessionMap.set(s.user_b_id, s.id);
  }

  assert(!hasSelfMatch, 'Zero self-matches detected across all concurrent requests');
  assert(
    userSessionMap.size === userCount,
    `All 50 users strictly paired into exactly 1 session (${userSessionMap.size}/${userCount})`
  );

  // Verify queue table is completely clean
  const remainingQueue = db.prepare('SELECT COUNT(*) as count FROM stranger_queue').get() as { count: number };
  assert(remainingQueue.count === 0, `Queue is completely empty after matching (${remainingQueue.count})`);

  // ── TEST SUITE 2: Concurrent Skip & Cooldown Lifecycle ────────────────
  console.log('\n2. Concurrent Skip & Cooldown Lifecycle:');
  const activeSessions = db.prepare("SELECT * FROM stranger_sessions WHERE status = 'CONNECTED'").all() as any[];
  assert(activeSessions.length === 25, `25 active sessions verified before skip (${activeSessions.length})`);

  // Concurrently skip 10 sessions from user_a side
  const skipPromises = activeSessions.slice(0, 10).map((sess) => StrangerCamService.skipCall(sess.id, sess.user_a_id));
  const skipResults = await Promise.all(skipPromises);

  const allSkippedSuccess = skipResults.every((r) => r.success);
  assert(allSkippedSuccess, 'All 10 concurrent skips succeeded cleanly');

  // Verify database reflects SKIPPED status
  const skippedInDb = db.prepare("SELECT COUNT(*) as count FROM stranger_sessions WHERE status = 'SKIPPED'").get() as { count: number };
  assert(skippedInDb.count === 10, `Database reflects 10 SKIPPED sessions (${skippedInDb.count})`);

  // Verify skip cooldown: Pair 0 user_a and user_b try to match again immediately
  const pair0 = activeSessions[0];
  const reenter1 = await StrangerCamService.joinQueue(pair0.user_a_id, ['Semarang']);
  assert(reenter1.status === 'QUEUED', 'User A enters queue waiting for partner');

  const reenter2 = await StrangerCamService.joinQueue(pair0.user_b_id, ['Semarang']);
  assert(
    reenter2.status === 'QUEUED',
    'User B enters queue but is NOT matched with User A due to 60s skip cooldown'
  );

  // Clean queue for next test
  db.prepare('DELETE FROM stranger_queue').run();

  // ── TEST SUITE 3: Realtime WebRTC Signaling & SignalBus ──────────────────
  console.log('\n3. Realtime Signaling, SignalBus & P2P Confirmation:');
  const userLiveA = testUsers[20];
  const userLiveB = testUsers[21];

  // Join and match LiveA and LiveB
  await StrangerCamService.joinQueue(userLiveA, ['Semarang']);
  const liveMatch = await StrangerCamService.joinQueue(userLiveB, ['Semarang']);
  const liveSessionId = liveMatch.session!.id;

  // Verify SignalBus subscription
  let sseSignalReceived: any = null;
  const unsubscribe = SignalBus.subscribe(liveSessionId, userLiveB, (signal) => {
    sseSignalReceived = signal;
  });

  // User A sends offer to User B
  const offerPayload = JSON.stringify({ type: 'offer', sdp: 'v=0...' });
  StrangerCamService.sendSignal(liveSessionId, userLiveA, 'OFFER', offerPayload);

  assert(sseSignalReceived !== null, 'SignalBus dispatched live signal to subscriber synchronously');
  assert(sseSignalReceived?.signalType === 'OFFER', 'Dispatched signal type is OFFER');
  assert(sseSignalReceived?.senderId === userLiveA, 'Dispatched signal sender is userLiveA');

  unsubscribe();

  // Confirm P2P WebRTC connection
  const p2pConfirm = StrangerCamService.confirmP2PConnected(liveSessionId, userLiveA);
  assert(p2pConfirm.success, 'P2P connection confirmed on backend');

  const liveSessionRecord = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(liveSessionId) as any;
  assert(liveSessionRecord.webrtc_connected_at !== null, 'webrtc_connected_at timestamp recorded in database');

  // ── TEST SUITE 4: Security & Anti-Abuse (Forged Sessions & Unauthorized Signals)
  console.log('\n4. Security & Anti-Abuse Hardening:');
  const attacker = testUsers[22];

  // Attacker tries to send signal to liveSessionId
  let attackerBlocked = false;
  try {
    StrangerCamService.sendSignal(liveSessionId, attacker, 'OFFER', 'fake_sdp');
  } catch (err: any) {
    attackerBlocked = true;
  }
  assert(attackerBlocked, 'Attacker rejected from sending signals to sessions they are not part of');

  // Attacker tries to skip liveSessionId
  const attackerSkip = StrangerCamService.skipCall(liveSessionId, attacker);
  assert(!attackerSkip.success, 'Attacker strictly rejected from skipping sessions they do not belong to');

  // Stale Heartbeat Auto-Expiration
  console.log('\n5. Session Heartbeat & Presence Auto-Cleanup:');
  // Set last_heartbeat of both users to 35 seconds ago
  const oldHeartbeat = (db.prepare("SELECT datetime('now', '-35 seconds') as dt").get() as any).dt;
  db.prepare('DELETE FROM stranger_presence WHERE user_id IN (?, ?)').run(userLiveA, userLiveB);
  db.prepare('INSERT INTO stranger_presence (user_id, session_id, last_heartbeat) VALUES (?, ?, ?), (?, ?, ?)').run(
    userLiveA, liveSessionId, oldHeartbeat,
    userLiveB, liveSessionId, oldHeartbeat
  );

  // Trigger heartbeat check from attacker
  StrangerCamService.recordHeartbeat(attacker);

  const timedOutSession = db.prepare('SELECT * FROM stranger_sessions WHERE id = ?').get(liveSessionId) as any;
  assert(timedOutSession.status === 'ENDED', `Stale session auto-terminated to ENDED (${timedOutSession.status})`);
  assert(timedOutSession.end_reason === 'SESSION_TIMEOUT', `End reason recorded as SESSION_TIMEOUT (${timedOutSession.end_reason})`);

  // ── TEST SUITE 5: Block Enforcement ──────────────────────────────────────
  console.log('\n6. Persistent Block Enforcement:');
  const userBlocker = testUsers[30];
  const userBlocked = testUsers[31];

  // Create temporary session for block
  await StrangerCamService.joinQueue(userBlocker, ['Semarang']);
  const dummyMatch = await StrangerCamService.joinQueue(userBlocked, ['Semarang']);
  const dummySessionId = dummyMatch.session!.id;

  StrangerCamService.blockUser(dummySessionId, userBlocker, userBlocked);

  // Clear any skip records between them to isolate block check
  db.prepare('DELETE FROM stranger_skips WHERE user_id = ? AND skipped_user_id = ?').run(userBlocker, userBlocked);
  db.prepare('DELETE FROM stranger_skips WHERE user_id = ? AND skipped_user_id = ?').run(userBlocked, userBlocker);

  await StrangerCamService.joinQueue(userBlocker, ['Semarang']);
  const blockedMatchAttempt = await StrangerCamService.joinQueue(userBlocked, ['Semarang']);

  assert(
    blockedMatchAttempt.status === 'QUEUED',
    'Blocked user is NEVER matched with blocker even when both are in queue with no skip cooldown'
  );

  // Clean up test file
  if (fs.existsSync(TEST_DB_PATH)) {
    try { fs.unlinkSync(TEST_DB_PATH); } catch {}
  }

  console.log('\n===============================================================');
  console.log(`HARDENING TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runHardeningTests().catch((err) => {
  console.error('Hardening test error:', err);
  process.exit(1);
});
