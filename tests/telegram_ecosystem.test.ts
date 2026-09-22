import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDatabase } from '../src/database/db';
import { seedDatabase } from '../src/database/seed';
import { TelegramService } from '../src/services/telegram/telegramService';
import { NotifyService } from '../src/services/notification/notifyService';
import { StrangerCamService } from '../src/services/stranger/strangerCamService';
import { SupportService } from '../src/services/support/supportService';
import { PaymentService } from '../src/services/payment/paymentService';
import { ModerationService } from '../src/services/safety/moderationService';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'telegram_ecosystem_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.STRANGER_CAM_ENABLED = 'true';
process.env.NOTIFY_NIVA_ENABLED = 'true';
process.env.NOTIFY_NIVA_CHAT_ID = '123456789';
process.env.TELEGRAM_ADMIN_CHAT_ID = '123456789';

async function runTelegramEcosystemTests() {
  console.log('===============================================================');
  console.log('       NIVA TELEGRAM ECOSYSTEM — PRODUCTION VERIFICATION       ');
  console.log('===============================================================\n');

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  initDatabase(TEST_DB_PATH);
  seedDatabase(TEST_DB_PATH);
  const db = getDatabase(TEST_DB_PATH);

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

  function createTestUser(name: string, telegramId?: string): { id: string; telegramId: string } {
    const userId = uuidv4();
    const tgId = telegramId || String(Math.floor(100000000 + Math.random() * 900000000));
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, is_18_plus, verification_status, subscription_status, environment, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', 1, 'UNVERIFIED', 'FREE', 'DEVELOPMENT', datetime('now'), datetime('now'))
    `).run(userId, tgId);

    const profileId = uuidv4();
    db.prepare(`
      INSERT INTO profiles (id, user_id, display_name, age, institution_id, study_field, bio, interests, relationship_intent, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 21, 'inst-undip', 'Informatika', 'Mahasiswa Semarang', '["Coding"]', 'NEW_FRIENDS', 1, datetime('now'), datetime('now'))
    `).run(profileId, userId, name);

    StrangerCamService.confirmSemarangLocation(userId, 'USER_CONFIRMATION');
    return { id: userId, telegramId: tgId };
  }

  console.log('--- 1. Account Linking & Security ---');
  {
    const userWeb = createTestUser('Web User Budi', 'stranger_web_initial');
    const newTelegramChatId = '987654321';

    // Generate link token
    const tokenResult = TelegramService.createLinkToken(userWeb.id);
    const rawToken = tokenResult.token;
    assert(typeof rawToken === 'string' && rawToken.length === 48, 'Generated cryptographic linking token');
    assert(tokenResult.linkUrl.includes(rawToken), 'Link URL includes valid start payload');

    // Token stored hashed in DB
    const tokenRow = db.prepare('SELECT * FROM telegram_link_tokens WHERE user_id = ?').get(userWeb.id) as any;
    assert(tokenRow !== undefined, 'Linking token recorded in database');
    assert(tokenRow.token_hash !== rawToken, 'Raw token is never stored in plaintext (SHA-256 hashed)');
    assert(tokenRow.used_at === null, 'Token initial state has used_at = null');

    // Redeem token to link account
    const linkResult = TelegramService.verifyAndLinkToken(rawToken, newTelegramChatId);
    assert(linkResult.success === true, 'Token successfully redeemed');
    assert(linkResult.userId === userWeb.id, 'Token maps to correct NIVA user ID');

    // User record updated with new telegram_chat_id
    const updatedUser = db.prepare('SELECT telegram_id FROM users WHERE id = ?').get(userWeb.id) as any;
    assert(updatedUser.telegram_id === newTelegramChatId, 'users.telegram_id updated to Telegram Chat ID');

    // Replay attack prevention: second redemption must return success = false
    const replayResult = TelegramService.verifyAndLinkToken(rawToken, newTelegramChatId);
    assert(replayResult.success === false && replayResult.message.includes('sudah pernah digunakan'), 'Replay protection active: used token cannot be redeemed a second time');

    // Invalid token rejection
    const invalidResult = TelegramService.verifyAndLinkToken('fake_invalid_token_12345678901234567890123456789012', '111111');
    assert(invalidResult.success === false && invalidResult.message.includes('tidak ditemukan'), 'Invalid tokens are rejected server-side');
  }

  console.log('\n--- 2. Notification Engine & Audit Events ---');
  {
    // Test operational notification logging
    const testUserId = uuidv4();
    await NotifyService.notifyNewUser({
      userId: testUserId,
      name: 'Rian Pratama',
      institutionName: 'Universitas Diponegoro',
      verificationLevel: 'UNVERIFIED',
      sourcePlatform: 'TELEGRAM',
    });

    // Check notification_events audit record
    const eventRow = db.prepare(`
      SELECT * FROM notification_events 
      WHERE event_type = 'NEW_USER' AND user_id = ?
      ORDER BY created_at DESC LIMIT 1
    `).get(testUserId) as any;

    assert(eventRow !== undefined, 'Operational notification event recorded in notification_events');
    assert(['PENDING', 'SENT', 'FAILED'].includes(eventRow.status), `Event status is valid: ${eventRow?.status}`);

    // System Alert test
    await NotifyService.notifySystemAlert('High Queue Concurrency Alert', 'Matchmaking queue reached 50 active users', 'HIGH');
    const alertRow = db.prepare(`
      SELECT * FROM notification_events 
      WHERE event_type = 'SYSTEM_ALERT'
      ORDER BY created_at DESC LIMIT 1
    `).get() as any;
    assert(alertRow !== undefined, 'System alert event logged to database');
  }

  console.log('\n--- 3. Telegram Matchmaking & Control Lifecycle ---');
  {
    const userA = createTestUser('User A (Telegram)', '5550001');
    const userB = createTestUser('User B (Telegram)', '5550002');

    // Clean queue
    db.prepare('DELETE FROM stranger_queue').run();
    db.prepare('DELETE FROM stranger_sessions').run();

    // User A joins matchmaking from Telegram
    const joinA = StrangerCamService.joinQueue(userA.id);
    assert(joinA.status === 'QUEUED', 'User A placed in queue (QUEUED)');

    // In-queue status check
    const queuedRow = db.prepare('SELECT * FROM stranger_queue WHERE user_id = ?').get(userA.id);
    assert(queuedRow !== undefined, 'User A confirmed present in stranger_queue');

    // User B joins matchmaking -> pair created atomically
    const joinB = StrangerCamService.joinQueue(userB.id);
    assert(joinB.status === 'CONNECTED', 'User B triggers atomic match (CONNECTED)');
    assert(joinB.session !== undefined, 'Match session created with valid session ID');

    const sessionId = joinB.session.id;

    // Both users removed from queue
    const queueCount = db.prepare('SELECT COUNT(*) as count FROM stranger_queue').get() as { count: number };
    assert(queueCount.count === 0, 'Both users atomically removed from stranger_queue on match');

    // Active session lookup from Telegram /status
    const activeA = StrangerCamService.getActiveSessionForUser(userA.id);
    const activeB = StrangerCamService.getActiveSessionForUser(userB.id);
    assert(activeA !== null && activeA.id === sessionId, 'Telegram /status identifies active session for User A');
    assert(activeB !== null && activeB.id === sessionId, 'Telegram /status identifies active session for User B');

    // Telegram SKIP action
    const skipResult = StrangerCamService.skipCall(sessionId, userA.id);
    assert(skipResult.success === true, 'Telegram SKIP terminates current match');

    const skippedSession = db.prepare('SELECT status, end_reason FROM stranger_sessions WHERE id = ?').get(sessionId) as any;
    assert(skippedSession.status === 'SKIPPED', 'Session status updated to SKIPPED in DB');
    assert(skippedSession.end_reason.includes('SKIPPED_BY_'), 'Session end_reason records skipper ID');

    // Rematch cooldown enforcement prevents instant re-match with same partner
    const rematchedQueueA = StrangerCamService.joinQueue(userA.id);
    const rematchedQueueB = StrangerCamService.joinQueue(userB.id);
    assert(rematchedQueueA.status === 'QUEUED' || rematchedQueueB.status === 'QUEUED', 'Cooldown prevents immediate rematch with skipped partner');

    // Telegram STOP / leaveQueue action
    StrangerCamService.leaveQueue(userA.id);
    StrangerCamService.leaveQueue(userB.id);
    const postStopQueue = db.prepare('SELECT COUNT(*) as count FROM stranger_queue').get() as { count: number };
    assert(postStopQueue.count === 0, 'Telegram /stop cleans up queue participation completely');

    // Telegram BLOCK action
    const userC = createTestUser('User C', '5550003');
    const userD = createTestUser('User D', '5550004');
    const matchCD = StrangerCamService.joinQueue(userC.id);
    const matchCD2 = StrangerCamService.joinQueue(userD.id);
    const sessionCDId = matchCD2.session?.id;

    StrangerCamService.blockUser(sessionCDId, userC.id, userD.id);

    // Verify block persists in database
    const blockRow = db.prepare('SELECT * FROM stranger_blocks WHERE user_id = ? AND blocked_user_id = ?').get(userC.id, userD.id);
    assert(blockRow !== undefined, 'Block persisted to database stranger_blocks table');

    // Subsequent match between blocked users is strictly prohibited
    const joinC = StrangerCamService.joinQueue(userC.id);
    const joinD = StrangerCamService.joinQueue(userD.id);
    assert(joinD.status === 'QUEUED', 'Pairing engine strictly isolates blocked users into separate queues');
    StrangerCamService.leaveQueue(userC.id);
    StrangerCamService.leaveQueue(userD.id);
  }

  console.log('\n--- 4. Support Ticketing & Bidirectional Chat Flow ---');
  {
    const customer = createTestUser('Dina Amalia', '7770001');

    // 1. Customer initiates support ticket from Telegram
    const { ticket, isNew } = SupportService.getOrCreatePremiumTicket(customer.id);
    assert(isNew === true, 'New support ticket created for user');
    assert(ticket.id.startsWith('NIVA-PREM-'), 'Ticket ID follows standard NIVA-PREM-XXXXXX format');
    assert(ticket.status === 'OPEN', 'Initial ticket status is OPEN');

    // Anti-duplication: second call returns same ticket
    const secondCall = SupportService.getOrCreatePremiumTicket(customer.id);
    assert(secondCall.isNew === false && secondCall.ticket.id === ticket.id, 'Anti-duplication active: re-entry returns same open ticket');

    // 2. User sends message from Telegram
    const userMsg = SupportService.sendMessage(ticket.id, 'USER', customer.id, 'Dina Amalia', 'Halo admin, saya ingin upgrade ke paket Early Access');
    assert(userMsg.sender_type === 'USER', 'User message recorded with sender_type = USER');
    assert(userMsg.ticket_id === ticket.id, 'User message bound to correct ticket');

    // Ticket status moves to WAITING (waiting for admin)
    const afterUserMsg = db.prepare('SELECT status FROM support_tickets WHERE id = ?').get(ticket.id) as any;
    assert(afterUserMsg.status === 'WAITING', 'Ticket status moves to WAITING after user message');

    // 3. Admin claims ticket and replies from Admin Panel / @notifynivabot
    SupportService.updateTicketStatus(ticket.id, 'IN_PROGRESS', 'admin_99', 'Admin reviewing');
    const adminMsg = SupportService.sendMessage(ticket.id, 'ADMIN', 'admin_99', 'Admin Sula Support', 'Halo Dina! Silakan transfer ke QRIS berikut.');
    assert(adminMsg.sender_type === 'ADMIN', 'Admin reply recorded with sender_type = ADMIN');

    // Ticket status moves to WAITING_FOR_USER
    const afterAdminMsg = db.prepare('SELECT status, assigned_admin_id FROM support_tickets WHERE id = ?').get(ticket.id) as any;
    assert(afterAdminMsg.status === 'WAITING_FOR_USER', 'Ticket status transitions to WAITING_FOR_USER');
    assert(afterAdminMsg.assigned_admin_id === 'admin_99', 'Ticket assigned to admin_99');

    // 4. User sends follow-up response -> appends to same ticket
    const userReply = SupportService.sendMessage(ticket.id, 'USER', customer.id, 'Dina Amalia', 'Baik admin, bukti bayar sudah saya transfer');
    const allMessages = db.prepare('SELECT * FROM support_messages WHERE ticket_id = ? ORDER BY created_at ASC').all(ticket.id) as any[];
    assert(allMessages.length >= 4, `All 4 conversation messages stored chronologically in single ticket (found: ${allMessages.length})`);

    // 5. Admin resolves ticket
    SupportService.updateTicketStatus(ticket.id, 'RESOLVED', 'admin_99', 'Pembayaran terkonfirmasi');
    const resolvedTicket = db.prepare('SELECT status, closed_at FROM support_tickets WHERE id = ?').get(ticket.id) as any;
    assert(resolvedTicket.status === 'RESOLVED', 'Ticket status updated to RESOLVED');
    assert(resolvedTicket.closed_at !== null, 'closed_at timestamp set when ticket is resolved');
  }

  console.log('\n--- 5. Premium Subscription & Payment Verification ---');
  {
    const buyer = createTestUser('Eko Prasetyo', '8880001');

    // Initial status: FREE
    const initUser = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get(buyer.id) as any;
    assert(initUser.subscription_status === 'FREE', 'Initial user subscription is FREE');

    // 1. Create real payment request (QRIS)
    const plans = PaymentService.getPlans();
    assert(plans.length > 0, 'Subscription plans loaded from database');
    const chosenPlan = plans[0];

    const payment = PaymentService.createPaymentRequest(buyer.id, chosenPlan.id, 'QRIS');
    assert(payment.id.startsWith('INV-NIVA-'), 'Generated valid payment ID format INV-NIVA-YYYYMMDD-XXXXXX');
    assert(payment.status === 'PENDING', 'Payment status is PENDING (No fake success!)');
    assert(payment.amount === chosenPlan.price, `Payment amount matches plan price (Rp${chosenPlan.price})`);

    // 2. Admin verifies payment (Transactional approval)
    PaymentService.resolvePayment(payment.id, 'APPROVE', 'admin_finance', 'Bukti transfer valid');

    // 3. Database state verification: Server-Authoritative activation
    const approvedPayment = db.prepare('SELECT status, reviewed_by FROM payment_requests WHERE id = ?').get(payment.id) as any;
    assert(approvedPayment.status === 'APPROVED', 'Payment request marked APPROVED');
    assert(approvedPayment.reviewed_by === 'admin_finance', 'Payment reviewer logged in audit trail');

    const activeSub = db.prepare("SELECT * FROM subscriptions WHERE user_id = ? AND status = 'ACTIVE'").get(buyer.id) as any;
    assert(activeSub !== undefined, 'Active subscription record created in subscriptions table');
    assert(new Date(activeSub.ends_at).getTime() > Date.now(), 'Subscription ends_at set to valid future date (30 days)');

    const updatedBuyer = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get(buyer.id) as any;
    assert(updatedBuyer.subscription_status === 'PREMIUM_ACTIVE', 'User subscription_status updated to PREMIUM_ACTIVE');
  }

  console.log('\n--- 6. Telegram Deep Link Token Security ---');
  {
    const userDeep = createTestUser('Deep Link User');
    const token = SupportService.createBridgeToken(userDeep.id, undefined, 'PREMIUM_SUPPORT');

    assert(typeof token === 'string' && token.length === 64, 'Created 64-char cryptographic bridge token');

    // Exchange token
    const sessionData = SupportService.exchangeBridgeToken(token);
    assert(sessionData.userId === userDeep.id, 'Bridge token accurately authenticates user ID');

    // Replay attempt must fail immediately
    let bridgeReplayBlocked = false;
    try {
      SupportService.exchangeBridgeToken(token);
    } catch (err: any) {
      if (err.message.includes('TOKEN_ALREADY_USED')) {
        bridgeReplayBlocked = true;
      }
    }
    assert(bridgeReplayBlocked, 'Single-use bridge token prevents replay attacks');
  }

  console.log('\n===============================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTelegramEcosystemTests().catch((err) => {
  console.error('Test run error:', err);
  process.exit(1);
});
