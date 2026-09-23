import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/src/database/db';
import { ServerlessRateLimiter } from '@/src/services/security/serverlessRateLimiter';
import { config } from '@/src/config/index';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Cron Secret Authorization
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // In production, reject unauthorized calls
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'UNAUTHORIZED_CRON_REQUEST' }, { status: 401 });
    }
  }

  const results = {
    timestamp: new Date().toISOString(),
    stale_match_queues_cleared: 0,
    stale_stranger_queues_cleared: 0,
    expired_sessions_closed: 0,
    outbox_notifications_processed: 0,
    rate_limits_pruned: 0,
    old_updates_pruned: 0,
  };

  try {
    const db = getDatabase();

    // 2. Clear Stale Match Queues (Users inactive > 15 mins)
    const mqRes = db.prepare(`
      DELETE FROM match_queue 
      WHERE status = 'SEARCHING' AND datetime(last_heartbeat) < datetime('now', '-15 minutes')
    `).run();
    results.stale_match_queues_cleared = Number(mqRes.changes || 0);

    const sqRes = db.prepare(`
      DELETE FROM stranger_queue 
      WHERE status = 'QUEUED' AND datetime(entered_at) < datetime('now', '-15 minutes')
    `).run();
    const scqRes = db.prepare(`
      DELETE FROM stranger_chat_queue 
      WHERE status = 'QUEUED' AND datetime(entered_at) < datetime('now', '-15 minutes')
    `).run();
    results.stale_stranger_queues_cleared = Number(sqRes.changes || 0) + Number(scqRes.changes || 0);

    // 3. Expire Past-Due 20-Minute Match Sessions (Serverless Safety Net)
    const expiredSessions = db.prepare(`
      SELECT id, user_a_id, user_b_id 
      FROM match_sessions 
      WHERE status = 'ACTIVE' AND datetime(expires_at) <= datetime('now')
    `).all() as { id: string; user_a_id: string; user_b_id: string }[];

    for (const session of expiredSessions) {
      db.prepare(`
        UPDATE match_sessions 
        SET status = 'COMPLETED', ended_at = datetime('now'), ended_reason = 'TIME_EXPIRED', updated_at = datetime('now')
        WHERE id = ?
      `).run(session.id);

      db.prepare(`
        UPDATE users 
        SET bot_state = 'READY', active_session_id = NULL, updated_at = datetime('now') 
        WHERE id IN (?, ?) AND active_session_id = ?
      `).run(session.user_a_id, session.user_b_id, session.id);

      results.expired_sessions_closed++;
    }

    // 4. Process Outbox Notification Queue
    try {
      const pendingOutbox = db.prepare(`
        SELECT id, event_type, payload, retry_count 
        FROM notification_queue 
        WHERE status IN ('PENDING', 'RETRY') AND retry_count < 3
        ORDER BY created_at ASC 
        LIMIT 20
      `).all() as { id: string; event_type: string; payload: string; retry_count: number }[];

      for (const item of pendingOutbox) {
        try {
          const payload = JSON.parse(item.payload);
          // If admin notify token and chat are present, dispatch
          const adminToken = config.NOTIFY_NIVA_BOT_TOKEN;
          const adminChat = config.NOTIFY_NIVA_CHAT_ID || '5764989848';

          if (adminToken && adminChat && payload.text) {
            const res = await fetch(`https://api.telegram.org/bot${adminToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: adminChat,
                text: payload.text,
                parse_mode: payload.parse_mode || 'Markdown',
              }),
            });

            if (res.ok) {
              db.prepare(`
                UPDATE notification_queue 
                SET status = 'SENT', sent_at = datetime('now') 
                WHERE id = ?
              `).run(item.id);
              results.outbox_notifications_processed++;
              continue;
            }
          }

          // Mark retry
          db.prepare(`
            UPDATE notification_queue 
            SET status = 'RETRY', retry_count = retry_count + 1 
            WHERE id = ?
          `).run(item.id);
        } catch (itemErr: any) {
          db.prepare(`
            UPDATE notification_queue 
            SET status = 'RETRY', retry_count = retry_count + 1, error_message = ? 
            WHERE id = ?
          `).run(itemErr.message || 'Processing error', item.id);
        }
      }
    } catch {}

    // 5. Prune Expired Rate Limits
    results.rate_limits_pruned = ServerlessRateLimiter.pruneExpired();

    // 6. Prune Old Telegram Processed Updates (> 48 hours)
    const pruneUpdatesRes = db.prepare(`
      DELETE FROM telegram_processed_updates 
      WHERE datetime(processed_at) < datetime('now', '-48 hours')
    `).run();
    results.old_updates_pruned = Number(pruneUpdatesRes.changes || 0);

    return NextResponse.json({
      status: 'SUCCESS',
      message: 'Serverless maintenance completed successfully',
      metrics: results,
    });
  } catch (err: any) {
    console.error('[Vercel Cron Maintenance Error]:', err);
    return NextResponse.json(
      {
        status: 'ERROR',
        error: 'CRON_MAINTENANCE_FAILED',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
