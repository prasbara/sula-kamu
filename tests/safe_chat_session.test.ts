import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDatabase } from '../src/database/db.js';
import { seedDatabase } from '../src/database/seed.js';
import { SafeChatService } from '../src/services/chat/safeChatService.js';
import { MatchingService } from '../src/services/matchmaking/matchingService.js';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'safe_chat_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;

async function runSafeChatTestSuite() {
  console.log('===============================================================');
  console.log('  NIVA EXCLUSIVE 10-MINUTE ACTIVE MATCH SESSION TEST SUITE     ');
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

  function createTestUser(name: string) {
    const userId = uuidv4();
    const profileId = uuidv4();
    const telegramId = `tg-${name}-${uuidv4().slice(0, 6)}`;
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, verification_status, subscription_status, environment, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', 'PHOTO_VERIFIED', 'FREE', 'TEST', datetime('now'), datetime('now'))
    `).run(userId, telegramId);

    db.prepare(`
      INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field, bio, interests, relationship_intent, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 21, 'inst-undip', 'Informatika', 'Bio test student', '["Ngoding"]', 'DATING', 1, datetime('now'), datetime('now'))
    `).run(profileId, userId, name);

    return userId;
  }

  function createMatch(userA: string, userB: string) {
    const matchId = uuidv4();
    db.prepare(`
      INSERT INTO matches (id, user_a_id, user_b_id, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
    `).run(matchId, userA, userB);
    return matchId;
  }

  // -------------------------------------------------------------
  // TEST 1: A and B match. Neither enters Safe Chat.
  // -------------------------------------------------------------
  console.log('\n1. Test 1: A and B match, neither enters Safe Chat');
  const userA1 = createTestUser('UserA1');
  const userB1 = createTestUser('UserB1');
  const match1 = createMatch(userA1, userB1);

  const lockCheckA1 = SafeChatService.isUserLocked(userA1);
  const lockCheckB1 = SafeChatService.isUserLocked(userB1);
  assert(!lockCheckA1.locked, 'User A has NO discovery lock upon match creation alone');
  assert(!lockCheckB1.locked, 'User B has NO discovery lock upon match creation alone');

  const sessionStatus1 = SafeChatService.getSessionStatus(match1);
  assert(sessionStatus1.activeSeconds === 0, 'Timer = 0 before entering');
  assert(sessionStatus1.status === 'SAFE_CHAT_WAITING', 'Session is SAFE_CHAT_WAITING');

  // -------------------------------------------------------------
  // TEST 2: A enters Safe Chat, B does not.
  // -------------------------------------------------------------
  console.log('\n2. Test 2: User A enters Safe Chat, User B does not');
  const joinA1 = SafeChatService.joinSession(match1, userA1);
  assert(joinA1.session.status === 'SAFE_CHAT_WAITING', 'Status remains SAFE_CHAT_WAITING when only A enters');
  assert(joinA1.session.user_a_joined_at !== null, 'A has joined timestamp');
  assert(joinA1.session.user_b_joined_at === null, 'B has not joined yet');
  assert(joinA1.session.active_seconds === 0, 'No active-time accumulation when only one user participates');
  const lockAfterAJoinedOnly = SafeChatService.isUserLocked(userA1);
  assert(!lockAfterAJoinedOnly.locked, 'Exclusive discovery lock NOT engaged until BOTH users join');

  // -------------------------------------------------------------
  // TEST 3: Both A and B enter Safe Chat.
  // -------------------------------------------------------------
  console.log('\n3. Test 3: Both A and B enter Safe Chat');
  const joinB1 = SafeChatService.joinSession(match1, userB1);
  assert(joinB1.session.status === 'SAFE_CHAT_ACTIVE', 'Status transitions to SAFE_CHAT_ACTIVE when both join');
  assert(joinB1.lockAcquired === true, 'Locks acquired on mutual join');

  const lockA1_afterBoth = SafeChatService.isUserLocked(userA1);
  const lockB1_afterBoth = SafeChatService.isUserLocked(userB1);
  assert(lockA1_afterBoth.locked === true, 'Exclusive discovery lock = TRUE for User A');
  assert(lockB1_afterBoth.locked === true, 'Exclusive discovery lock = TRUE for User B');

  // -------------------------------------------------------------
  // TEST 4 & 5: Inactivity, Timer Pause & Resume
  // -------------------------------------------------------------
  console.log('\n4 & 5. Test 4 & 5: A active, B inactive (paused), then B returns (resumed)');
  // Simulate B presence going stale (> 30 seconds ago)
  db.prepare(`
    UPDATE user_presence 
    SET last_heartbeat_at = datetime('now', '-45 seconds')
    WHERE user_id = ?
  `).run(userB1);

  // Send heartbeat / tick for A
  const beatA_paused = SafeChatService.tickActiveSeconds(match1, userA1);
  assert(beatA_paused.status === 'SAFE_CHAT_PAUSED', 'Timer pauses (SAFE_CHAT_PAUSED) when B goes inactive');
  assert(beatA_paused.userAActive && !beatA_paused.userBActive, 'User A active, User B inactive');

  // Now B sends heartbeat again
  const beatB_resumed = SafeChatService.tickActiveSeconds(match1, userB1);
  assert(beatB_resumed.status === 'SAFE_CHAT_ACTIVE', 'Timer resumes (SAFE_CHAT_ACTIVE) when B returns');
  assert(beatB_resumed.userAActive && beatB_resumed.userBActive, 'Both active again');

  // -------------------------------------------------------------
  // TEST 6 & 7 & 8: Discovery Lock Rejection (Like, Discovery Queue, Cross-User)
  // -------------------------------------------------------------
  console.log('\n6, 7 & 8. Test 6, 7, 8: Discovery & Like rejection while exclusive session active');
  const userC = createTestUser('UserC');

  let aLikeBlocked = false;
  try {
    MatchingService.handleLike(userA1, userC);
  } catch (err: any) {
    aLikeBlocked = err.message.includes('EXCLUSIVE_CHAT_ACTIVE') || err.message.includes('ngobrol');
  }
  assert(aLikeBlocked, 'User A cannot Like someone else during exclusive session');

  let bLikeBlocked = false;
  try {
    MatchingService.handleLike(userB1, userC);
  } catch (err: any) {
    bLikeBlocked = err.message.includes('EXCLUSIVE_CHAT_ACTIVE') || err.message.includes('ngobrol');
  }
  assert(bLikeBlocked, 'User B cannot Like someone else during exclusive session');

  let bPassBlocked = false;
  try {
    MatchingService.handlePass(userB1, userC);
  } catch (err: any) {
    bPassBlocked = err.message.includes('EXCLUSIVE_CHAT_ACTIVE') || err.message.includes('ngobrol');
  }
  assert(bPassBlocked, 'User B cannot Pass someone else during exclusive session');

  let aQueueBlocked = false;
  try {
    const aQueue = MatchingService.getDiscoveryQueue(userA1);
    if (aQueue.length === 0) aQueueBlocked = true;
  } catch (err: any) {
    aQueueBlocked = err.message.includes('EXCLUSIVE_CHAT_ACTIVE') || err.message.includes('ngobrol');
  }
  assert(aQueueBlocked, 'User A cannot open discovery queue while locked');

  // -------------------------------------------------------------
  // TEST 9: 600 active seconds reached -> Completion
  // -------------------------------------------------------------
  console.log('\n9. Test 9: Session completion after 600 active seconds');
  // Manually advance active_seconds in database to 600
  db.prepare(`
    UPDATE safe_chat_sessions 
    SET active_seconds = 600, status = 'SAFE_CHAT_ACTIVE'
    WHERE match_id = ?
  `).run(match1);

  const beatComplete = SafeChatService.tickActiveSeconds(match1, userA1);
  assert(beatComplete.status === 'SAFE_CHAT_COMPLETED', 'Status transitions to SAFE_CHAT_COMPLETED at 600s');
  assert(beatComplete.remainingSeconds === 0, 'Remaining seconds is 0');

  // -------------------------------------------------------------
  // TEST 10: Private Chat Consent: One YES, One NO
  // -------------------------------------------------------------
  console.log('\n10. Test 10: Private chat consent: One YES, One NO');
  const consentA1 = SafeChatService.recordPrivateDecision(match1, userA1, 'YES');
  assert(consentA1.status === 'PRIVATE_CHAT_PENDING', 'When A accepts, status is PRIVATE_CHAT_PENDING');

  const consentB1 = SafeChatService.recordPrivateDecision(match1, userB1, 'NO');
  assert(consentB1.status === 'ENDED_BY_USER', 'When B declines, status ends (ENDED_BY_USER)');
  
  const lockReleasedA1 = SafeChatService.isUserLocked(userA1);
  const lockReleasedB1 = SafeChatService.isUserLocked(userB1);
  assert(!lockReleasedA1.locked, 'User A discovery lock released when session ends');
  assert(!lockReleasedB1.locked, 'User B discovery lock released when session ends');

  // -------------------------------------------------------------
  // TEST 11: Mutual Consent: Both YES -> PRIVATE_CHAT_ENABLED
  // -------------------------------------------------------------
  console.log('\n11. Test 11: Mutual consent: Both YES -> PRIVATE_CHAT_ENABLED');
  const userA2 = createTestUser('UserA2');
  const userB2 = createTestUser('UserB2');
  const match2 = createMatch(userA2, userB2);
  SafeChatService.joinSession(match2, userA2);
  SafeChatService.joinSession(match2, userB2);

  // Fast forward to completed
  db.prepare(`
    UPDATE safe_chat_sessions 
    SET active_seconds = 600, status = 'SAFE_CHAT_COMPLETED'
    WHERE match_id = ?
  `).run(match2);

  SafeChatService.recordPrivateDecision(match2, userA2, 'YES');
  const mutualConsent = SafeChatService.recordPrivateDecision(match2, userB2, 'YES');
  assert(mutualConsent.status === 'PRIVATE_CHAT_ENABLED', 'Both YES results in PRIVATE_CHAT_ENABLED');

  const lockMutualA = SafeChatService.isUserLocked(userA2);
  const lockMutualB = SafeChatService.isUserLocked(userB2);
  assert(!lockMutualA.locked, 'User A discovery lock released upon mutual private chat');
  assert(!lockMutualB.locked, 'User B discovery lock released upon mutual private chat');

  // -------------------------------------------------------------
  // TEST 12: Block terminates immediately & releases lock
  // -------------------------------------------------------------
  console.log('\n12. Test 12: Safety Action - User A blocks User B');
  const userA3 = createTestUser('UserA3');
  const userB3 = createTestUser('UserB3');
  const match3 = createMatch(userA3, userB3);
  SafeChatService.joinSession(match3, userA3);
  SafeChatService.joinSession(match3, userB3);

  const blockRes = SafeChatService.endSession(match3, userA3, 'BLOCKED');
  assert(blockRes.success === true, 'End session block succeeded');
  const blockSession = SafeChatService.getSessionStatus(match3);
  assert(blockSession.status === 'BLOCKED', 'Session status is BLOCKED');
  assert(!SafeChatService.isUserLocked(userA3).locked, 'User A discovery lock released immediately');
  assert(!SafeChatService.isUserLocked(userB3).locked, 'User B discovery lock released immediately');

  // -------------------------------------------------------------
  // TEST 13: Report terminates immediately & releases lock
  // -------------------------------------------------------------
  console.log('\n13. Test 13: Safety Action - User A reports User B');
  const userA4 = createTestUser('UserA4');
  const userB4 = createTestUser('UserB4');
  const match4 = createMatch(userA4, userB4);
  SafeChatService.joinSession(match4, userA4);
  SafeChatService.joinSession(match4, userB4);

  const reportRes = SafeChatService.endSession(match4, userA4, 'REPORTED');
  assert(reportRes.success === true, 'End session report succeeded');
  const reportSession = SafeChatService.getSessionStatus(match4);
  assert(reportSession.status === 'REPORTED', 'Session status is REPORTED');
  assert(!SafeChatService.isUserLocked(userA4).locked, 'User A discovery lock released immediately');
  assert(!SafeChatService.isUserLocked(userB4).locked, 'User B discovery lock released immediately');

  // -------------------------------------------------------------
  // TEST 14: Multi-device & Server-Side Enforcement
  // -------------------------------------------------------------
  console.log('\n14. Test 14: Multi-device server-side lock enforcement');
  const userA5 = createTestUser('UserA5');
  const userB5 = createTestUser('UserB5');
  const match5 = createMatch(userA5, userB5);
  SafeChatService.joinSession(match5, userA5);
  SafeChatService.joinSession(match5, userB5);

  // Check server-side table directly
  const lockRowA = db.prepare(`
    SELECT released_at, session_id FROM user_exclusive_locks WHERE user_id = ?
  `).get(userA5) as any;
  assert(lockRowA !== undefined && lockRowA.released_at === null, 'Database table user_exclusive_locks records active lock for User A');

  const lockRowB = db.prepare(`
    SELECT released_at, session_id FROM user_exclusive_locks WHERE user_id = ?
  `).get(userB5) as any;
  assert(lockRowB !== undefined && lockRowB.released_at === null, 'Database table user_exclusive_locks records active lock for User B');

  // Clean up
  SafeChatService.endSession(match5, userA5, 'USER_ENDED');

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passed}/${passed + failed} TESTS PASSED (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSafeChatTestSuite().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
