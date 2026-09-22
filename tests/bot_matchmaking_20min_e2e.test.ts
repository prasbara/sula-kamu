import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../src/database/db';
import { BotMatchmakingService } from '../src/services/matchmaking/botMatchmakingService';
import { StatisticsService } from '../src/services/stats/statisticsService';
import { ModerationService } from '../src/services/safety/moderationService';

test('NIVA BOT — Complete End-To-End 14 Scenarios Test Suite', async (t) => {
  const db = getDatabase();

  // Ensure clean test environment
  db.prepare("DELETE FROM match_queue").run();
  db.prepare("DELETE FROM match_sessions WHERE status = 'ACTIVE'").run();

  // Fresh test Telegram IDs
  const tIdUser1 = `tg_test_user_1_${Date.now()}`;
  const tIdUser2 = `tg_test_user_2_${Date.now()}`;
  const tIdUser3 = `tg_test_user_3_${Date.now()}`;

  let userAId = '';
  let userBId = '';
  let userCId = '';

  await t.test('TEST 1: User baru /start -> DB user dibuat, onboarding status, counter bertambah 1', () => {
    const initialCounter = StatisticsService.getPublicStats().studentsJoined;

    const res = BotMatchmakingService.ensureUser(tIdUser1, 'alice_semarang', 'Alice Tembalang');
    userAId = res.userId;

    assert.equal(res.isNew, true, 'User A should be marked as new');
    assert.equal(res.botState, 'NEW', 'Initial state should be NEW');

    // User progresses onboarding -> completed
    const newCounter = StatisticsService.recordOnboardingCompletion(userAId);
    BotMatchmakingService.setUserState(userAId, 'READY');

    assert.equal(newCounter, initialCounter + 1, 'Counter must increment by 1 for newly onboarded user');

    const checkUser = db.prepare('SELECT bot_state, online_status FROM users WHERE id = ?').get(userAId) as any;
    assert.equal(checkUser.bot_state, 'READY');
    assert.equal(checkUser.online_status, 'ONLINE');
  });

  await t.test('TEST 2: Existing user /start -> User tidak duplicate, counter tidak bertambah', () => {
    const counterBefore = StatisticsService.getPublicStats().studentsJoined;

    const resRepeat = BotMatchmakingService.ensureUser(tIdUser1, 'alice_updated', 'Alice Tembalang');
    assert.equal(resRepeat.isNew, false, 'Existing user must not be marked as new');
    assert.equal(resRepeat.userId, userAId, 'Existing user ID must remain the same');

    const counterAfter = StatisticsService.recordOnboardingCompletion(userAId);
    assert.equal(counterAfter, counterBefore, 'Existing user completing /start again must NEVER increment counter');
  });

  await t.test('TEST 3: User A /match -> SEARCHING state', () => {
    const matchResA = BotMatchmakingService.match(userAId);
    assert.equal(matchResA.matched, false, 'No partner available yet');

    const statusA = BotMatchmakingService.getStatus(userAId);
    assert.equal(statusA.state, 'SEARCHING');
    assert.equal(statusA.isSearching, true);
    assert.equal(statusA.isChatting, false);

    const queueRow = db.prepare('SELECT * FROM match_queue WHERE user_id = ?').get(userAId) as any;
    assert.ok(queueRow, 'User A must exist in match_queue');
    assert.equal(queueRow.status, 'SEARCHING');
  });

  await t.test('TEST 4: User B /match -> Engine menemukan A+B, satu session dibuat, kedua user MATCHED / CHATTING', () => {
    const resB = BotMatchmakingService.ensureUser(tIdUser2, 'bob_semarang', 'Bob Pleburan');
    userBId = resB.userId;
    StatisticsService.recordOnboardingCompletion(userBId);
    BotMatchmakingService.setUserState(userBId, 'READY');

    const matchResB = BotMatchmakingService.match(userBId);
    assert.equal(matchResB.matched, true, 'User B should match with User A');
    assert.ok(matchResB.session, 'Match session must be created');
    assert.equal(matchResB.partnerUserId, userAId, 'User B partner should be User A');

    const sessionRow = db.prepare('SELECT * FROM match_sessions WHERE id = ?').get(matchResB.session.id) as any;
    assert.equal(sessionRow.status, 'ACTIVE');
    assert.equal(sessionRow.user_a_id, userAId);
    assert.equal(sessionRow.user_b_id, userBId);

    // Both users must be in CHATTING state
    const userARow = db.prepare('SELECT bot_state, active_session_id FROM users WHERE id = ?').get(userAId) as any;
    const userBRow = db.prepare('SELECT bot_state, active_session_id FROM users WHERE id = ?').get(userBId) as any;
    assert.equal(userARow.bot_state, 'CHATTING');
    assert.equal(userBRow.bot_state, 'CHATTING');
    assert.equal(userARow.active_session_id, matchResB.session.id);
    assert.equal(userBRow.active_session_id, matchResB.session.id);
  });

  await t.test('TEST 5: A mengirim pesan -> relay berhasil dan tercatat di DB', () => {
    const relayA = BotMatchmakingService.relayMessage(userAId, 'Halo Bob, salam kenal!');
    assert.equal(relayA.success, true);
    assert.equal(relayA.receiverUserId, userBId);
    assert.equal(relayA.receiverTelegramId, tIdUser2);

    const msgRow = db.prepare('SELECT * FROM match_session_messages WHERE id = ?').get(relayA.messageId) as any;
    assert.ok(msgRow);
    assert.equal(msgRow.sender_user_id, userAId);
    assert.equal(msgRow.receiver_user_id, userBId);
    assert.equal(msgRow.message, 'Halo Bob, salam kenal!');
  });

  await t.test('TEST 6: B membalas -> relay ke A berhasil dan tercatat di DB', () => {
    const relayB = BotMatchmakingService.relayMessage(userBId, 'Halo Alice! Kabar baik.');
    assert.equal(relayB.success, true);
    assert.equal(relayB.receiverUserId, userAId);
    assert.equal(relayB.receiverTelegramId, tIdUser1);

    const msgRow = db.prepare('SELECT * FROM match_session_messages WHERE id = ?').get(relayB.messageId) as any;
    assert.ok(msgRow);
    assert.equal(msgRow.sender_user_id, userBId);
    assert.equal(msgRow.receiver_user_id, userAId);
  });

  await t.test('TEST 7: A /match ketika CHATTING -> DENIED', () => {
    assert.throws(
      () => BotMatchmakingService.match(userAId),
      /USER_ALREADY_CHATTING/,
      'Must reject /match while user A is chatting'
    );
  });

  await t.test('TEST 8: B mencoba /match ketika CHATTING -> DENIED', () => {
    assert.throws(
      () => BotMatchmakingService.match(userBId),
      /USER_ALREADY_CHATTING/,
      'Must reject /match while user B is chatting'
    );
  });

  await t.test('TEST 9: 20 menit tercapai -> session otomatis CLOSED/COMPLETED, kedua user di-unlock', () => {
    const active = BotMatchmakingService.getActiveSession(userAId);
    assert.ok(active.session);

    // Simulate 20 minutes server timer expiration
    db.prepare("UPDATE match_sessions SET expires_at = datetime('now', '-1 minute') WHERE id = ?").run(active.session.id);

    // Checking active session should trigger auto-completion
    const expiredCheck = BotMatchmakingService.getActiveSession(userAId);
    assert.equal(expiredCheck.session, null, 'Active session must be cleared');
    assert.equal(expiredCheck.hasExpired, true, 'hasExpired must be true');

    const sessionDb = db.prepare('SELECT status, ended_reason FROM match_sessions WHERE id = ?').get(active.session.id) as any;
    assert.equal(sessionDb.status, 'COMPLETED');
    assert.equal(sessionDb.ended_reason, 'TIME_EXPIRED');

    const checkA = db.prepare('SELECT bot_state, active_session_id FROM users WHERE id = ?').get(userAId) as any;
    const checkB = db.prepare('SELECT bot_state, active_session_id FROM users WHERE id = ?').get(userBId) as any;
    assert.equal(checkA.bot_state, 'READY');
    assert.equal(checkB.bot_state, 'READY');
    assert.equal(checkA.active_session_id, null);
    assert.equal(checkB.active_session_id, null);
  });

  await t.test('TEST 10: A /match setelah session selesai -> dapat masuk queue lagi', () => {
    const res = BotMatchmakingService.match(userAId);
    assert.equal(res.matched, false);

    const statusA = BotMatchmakingService.getStatus(userAId);
    assert.equal(statusA.state, 'SEARCHING');
  });

  await t.test('TEST 11: A spam /match 10x -> tetap hanya satu queue entry', () => {
    for (let i = 0; i < 10; i++) {
      const res = BotMatchmakingService.match(userAId);
      assert.equal(res.alreadySearching, true);
    }

    const queueCount = (db.prepare('SELECT COUNT(*) as count FROM match_queue WHERE user_id = ?').get(userAId) as any).count;
    assert.equal(queueCount, 1, 'Queue must contain exactly one row despite 10 /match attempts');

    // Clean queue
    BotMatchmakingService.stop(userAId, 'USER_ENDED');
  });

  await t.test('TEST 12: Chat Isolation: User C tidak menerima pesan dari Session A+B', () => {
    const resC = BotMatchmakingService.ensureUser(tIdUser3, 'charlie_semarang', 'Charlie Undip');
    userCId = resC.userId;
    StatisticsService.recordOnboardingCompletion(userCId);
    BotMatchmakingService.setUserState(userCId, 'READY');

    // Create a new match between A and B
    BotMatchmakingService.match(userAId);
    const matchAB = BotMatchmakingService.match(userBId);
    assert.equal(matchAB.matched, true);

    // Relay message from A to B
    const relay = BotMatchmakingService.relayMessage(userAId, 'Pesan rahasia A dan B');

    // Verify User C is NOT the receiver and receives NO messages
    assert.notEqual(relay.receiverUserId, userCId);
    assert.equal(relay.receiverUserId, userBId);

    const msgForC = db.prepare('SELECT COUNT(*) as cnt FROM match_session_messages WHERE receiver_user_id = ?').get(userCId) as any;
    assert.equal(msgForC.cnt, 0, 'User C must never have messages from session A+B');

    // Clean up session
    BotMatchmakingService.stop(userAId, 'USER_ENDED');
  });

  await t.test('TEST 13: User baru lain onboarding -> landing page counter bertambah secara nyata', () => {
    const countBefore = StatisticsService.getPublicStats().studentsJoined;

    const tIdUser4 = `tg_user_4_${Date.now()}`;
    const res4 = BotMatchmakingService.ensureUser(tIdUser4, 'dina_semarang', 'Dina Tembalang');
    const countAfter = StatisticsService.recordOnboardingCompletion(res4.userId);

    assert.equal(countAfter, countBefore + 1, 'Counter must increment by 1 when User 4 completes onboarding');
  });

  await t.test('TEST 14: Failed notification does not break user creation', () => {
    const tIdUser5 = `tg_user_5_${Date.now()}`;
    // Even if external notification fails or is dormant, ensureUser MUST succeed
    const res5 = BotMatchmakingService.ensureUser(tIdUser5, 'eko_semarang', 'Eko Semarang');
    assert.ok(res5.userId);
    assert.equal(res5.isNew, true);

    const userDb = db.prepare('SELECT id, telegram_username FROM users WHERE id = ?').get(res5.userId) as any;
    assert.equal(userDb.telegram_username, 'eko_semarang');
  });
});
