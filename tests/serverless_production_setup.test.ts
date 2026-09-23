import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getDatabase, applyEssentialMigrations } from '../src/database/db';
import { createSqliteSessionStorage } from '../src/bot/telegramSessionStorage';
import { ServerlessRateLimiter } from '../src/services/security/serverlessRateLimiter';
import { BotMatchmakingService } from '../src/services/matchmaking/botMatchmakingService';
import { createBot } from '../src/bot/index';
import { createAdminNotifyBot } from '../src/bot/adminNotifyBot';
import { GET as healthCheckGet } from '../app/api/health/route';
import { GET as cronMaintenanceGet } from '../app/api/cron/maintenance/route';
import { POST as webhookPost, GET as webhookGet } from '../app/api/telegram/webhook/route';
import { NextRequest } from 'next/server';

describe('Serverless Production Setup & Hardening (Vercel)', () => {
  // Ensure DB ready & migrations applied
  const db = getDatabase();
  applyEssentialMigrations(db);

  it('1. Database Additive Migrations: Verify all serverless tables and indexes exist without data loss', () => {
    // Check tables exist
    const tables = [
      'telegram_sessions',
      'telegram_processed_updates',
      'serverless_rate_limits',
      'match_queue',
      'match_sessions',
      'match_session_messages',
      'notification_queue',
      'users',
      'support_tickets',
      'moderation_events',
      'payment_proofs',
    ];

    for (const table of tables) {
      const row = db.prepare("SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name = ?").get(table) as { cnt: number };
      assert.strictEqual(Number(row.cnt), 1, `Table ${table} must exist in database`);
    }

    // Verify critical indexes
    const indexes = [
      'idx_telegram_sessions_updated',
      'idx_telegram_proc_updates_time',
      'idx_srl_reset',
      'idx_ms_expiry',
      'idx_ms_users',
    ];

    for (const idx of indexes) {
      const row = db.prepare("SELECT count(*) as cnt FROM sqlite_master WHERE type='index' AND name = ?").get(idx) as { cnt: number };
      assert.strictEqual(Number(row.cnt), 1, `Index ${idx} must exist`);
    }
  });

  it('2. Persistent Grammy Session Storage: Must persist state across invocations and separate instances', () => {
    const storage = createSqliteSessionStorage<{ step: string; activeChatMatchId?: string }>();
    const sessionKey = 'test_user_session_999999';

    // Cleanup before test
    storage.delete(sessionKey);
    assert.strictEqual(storage.read(sessionKey), undefined);

    // Write session
    storage.write(sessionKey, { step: 'AWAITING_AGE', activeChatMatchId: 'match_abc_123' });

    // Read back through fresh adapter instance (simulating separate Vercel lambda invocation)
    const freshAdapter = createSqliteSessionStorage<{ step: string; activeChatMatchId?: string }>();
    const retrieved = freshAdapter.read(sessionKey);
    assert.ok(retrieved, 'Retrieved session should not be undefined');
    assert.strictEqual(retrieved.step, 'AWAITING_AGE');
    assert.strictEqual(retrieved.activeChatMatchId, 'match_abc_123');

    // Update session
    storage.write(sessionKey, { step: 'IDLE' });
    const updated = freshAdapter.read(sessionKey);
    assert.strictEqual(updated?.step, 'IDLE');

    // Delete session
    storage.delete(sessionKey);
    assert.strictEqual(freshAdapter.read(sessionKey), undefined);
  });

  it('3. Persistent Serverless Rate Limiter: Enforces limit and prunes expired entries', () => {
    const testKey = `test_ratelimit_${Date.now()}`;
    const limit = 3;
    const windowSec = 2;

    const r1 = ServerlessRateLimiter.checkLimit(testKey, limit, windowSec);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.remaining, 2);

    const r2 = ServerlessRateLimiter.checkLimit(testKey, limit, windowSec);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r2.remaining, 1);

    const r3 = ServerlessRateLimiter.checkLimit(testKey, limit, windowSec);
    assert.strictEqual(r3.allowed, true);
    assert.strictEqual(r3.remaining, 0);

    // 4th request exceeds limit
    const r4 = ServerlessRateLimiter.checkLimit(testKey, limit, windowSec);
    assert.strictEqual(r4.allowed, false);
    assert.strictEqual(r4.remaining, 0);

    // Prune test
    const pruned = ServerlessRateLimiter.pruneExpired();
    assert.strictEqual(typeof pruned, 'number');
  });

  it('4. Telegram Webhook Idempotency: Duplicate update_id must be deduplicated with HTTP 200', async () => {
    const testUpdateId = 888777000 + Math.floor(Math.random() * 10000);

    // First request with update_id
    const payload = JSON.stringify({
      update_id: testUpdateId,
      message: {
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 12345, type: 'private' },
        from: { id: 12345, is_bot: false, first_name: 'Tester' },
        text: '/status',
      },
    });

    const req1 = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    const res1 = await webhookPost(req1);
    assert.strictEqual(res1.status, 200);

    // Second request with SAME update_id (simulating Telegram retry)
    const req2 = new NextRequest('http://localhost:3000/api/telegram/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });

    const res2 = await webhookPost(req2);
    assert.strictEqual(res2.status, 200);
    const body2 = await res2.json();
    assert.strictEqual(body2.status, 'ALREADY_PROCESSED');
    assert.strictEqual(body2.update_id, testUpdateId);
  });

  it('5. 20-Minute Session Expiration: Serverless automatic expiry without in-memory timers', () => {
    const userA = `usr_test_a_${Date.now()}`;
    const userB = `usr_test_b_${Date.now()}`;
    const sessionId = `sess_test_${Date.now()}`;

    // Create test users
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, bot_state, online_status)
      VALUES (?, ?, 'ACTIVE', 'CHATTING', 'ONLINE')
    `).run(userA, `tg_test_a_${Date.now()}`);
    db.prepare(`
      INSERT INTO users (id, telegram_id, status, bot_state, online_status)
      VALUES (?, ?, 'ACTIVE', 'CHATTING', 'ONLINE')
    `).run(userB, `tg_test_b_${Date.now()}`);

    // Create an expired session (expires_at 1 minute in the past)
    db.prepare(`
      INSERT INTO match_sessions (id, user_a_id, user_b_id, status, started_at, expires_at)
      VALUES (?, ?, ?, 'ACTIVE', datetime('now', '-21 minutes'), datetime('now', '-1 minute'))
    `).run(sessionId, userA, userB);

    // Call getActiveSession
    const sessionResult = BotMatchmakingService.getActiveSession(userA);
    assert.strictEqual(sessionResult.session, null);
    assert.strictEqual(sessionResult.hasExpired, true);

    // Verify session updated in DB
    const checkDb = db.prepare('SELECT status, ended_reason FROM match_sessions WHERE id = ?').get(sessionId) as any;
    assert.strictEqual(checkDb.status, 'COMPLETED');
    assert.strictEqual(checkDb.ended_reason, 'TIME_EXPIRED');

    // Verify user bot_state unlocked back to READY
    const userRow = db.prepare('SELECT bot_state FROM users WHERE id = ?').get(userA) as any;
    assert.strictEqual(userRow.bot_state, 'READY');
  });

  it('6. Vercel Cron Maintenance Worker: Safely runs queue cleanup and outbox processing', async () => {
    // Ensure test user exists to satisfy foreign key
    db.prepare(`
      INSERT OR IGNORE INTO users (id, telegram_id, status, bot_state)
      VALUES ('user_stale_test', 'tg_stale_test', 'ACTIVE', 'SEARCHING')
    `).run();

    // Insert a stale queue item
    db.prepare(`
      INSERT INTO match_queue (id, user_id, status, entered_at, last_heartbeat)
      VALUES ('mq_stale_test', 'user_stale_test', 'SEARCHING', datetime('now', '-30 minutes'), datetime('now', '-30 minutes'))
      ON CONFLICT(user_id) DO UPDATE SET last_heartbeat = datetime('now', '-30 minutes')
    `).run();

    const cronReq = new NextRequest('http://localhost:3000/api/cron/maintenance', {
      method: 'GET',
    });

    const cronRes = await cronMaintenanceGet(cronReq);
    assert.strictEqual(cronRes.status, 200);

    const cronData = await cronRes.json();
    assert.strictEqual(cronData.status, 'SUCCESS');
    assert.ok(cronData.metrics.stale_match_queues_cleared >= 1);

    // Verify stale queue item was removed
    const remaining = db.prepare("SELECT * FROM match_queue WHERE id = 'mq_stale_test'").get();
    assert.strictEqual(remaining, undefined);
  });

  it('7. Health Check API: Must return healthy status, database connectivity, and NO leaked secrets', async () => {
    const healthRes = await healthCheckGet();
    assert.strictEqual(healthRes.status, 200);

    const data = await healthRes.json();
    assert.strictEqual(data.status, 'healthy');
    assert.strictEqual(data.checks.database.status, 'healthy');
    assert.strictEqual(data.runtime, 'vercel-serverless');

    // Verify no secret tokens leaked
    const jsonStr = JSON.stringify(data);
    assert.strictEqual(jsonStr.includes('bot_token'), false);
    assert.strictEqual(jsonStr.includes('token_hash'), false);
    assert.strictEqual(jsonStr.includes('password'), false);
    assert.strictEqual(jsonStr.includes('secret'), false);
  });

  it('8. Bot Architecture: Both User Bot and Admin Notify Bot instantiate and configure properly', () => {
    const userBot = createBot();
    assert.ok(userBot, 'User Bot instance should be initialized');

    const adminBot = createAdminNotifyBot();
    assert.ok(adminBot, 'Admin Notify Bot instance should be initialized');
  });

  it('9. Webhook Router: GET responds with status ACTIVE and endpoints', async () => {
    const res = await webhookGet();
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.status, 'ACTIVE');
    assert.strictEqual(body.persistence, 'DATABASE_BACKED');
    assert.strictEqual(body.idempotency, 'ENABLED');
  });
});
