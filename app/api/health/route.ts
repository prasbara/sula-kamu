import { NextResponse } from 'next/server';
import { getDatabase } from '@/src/database/db';
import { config } from '@/src/config/index';

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;
  let activeUsersCount = 0;
  let activeSessionsCount = 0;

  try {
    const db = getDatabase();
    const queryStart = Date.now();
    const testRow = db.prepare('SELECT 1 as alive').get() as { alive: number } | undefined;
    dbLatencyMs = Date.now() - queryStart;

    if (!testRow || testRow.alive !== 1) {
      dbStatus = 'degraded';
    }

    // Non-destructive operational metrics check
    const userCountRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'ACTIVE'").get() as { count: number } | undefined;
    activeUsersCount = Number(userCountRow?.count || 0);

    const sessionCountRow = db.prepare("SELECT COUNT(*) as count FROM match_sessions WHERE status = 'ACTIVE'").get() as { count: number } | undefined;
    activeSessionsCount = Number(sessionCountRow?.count || 0);
  } catch (err) {
    dbStatus = 'unhealthy';
  }

  const overallStatus = dbStatus === 'healthy' ? 'healthy' : 'degraded';
  const totalDurationMs = Date.now() - startTime;

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    duration_ms: totalDurationMs,
    environment: process.env.NODE_ENV || 'production',
    runtime: 'vercel-serverless',
    checks: {
      application: 'healthy',
      database: {
        status: dbStatus,
        latency_ms: dbLatencyMs,
      },
      services: {
        telegram_user_bot: config.TELEGRAM_BOT_TOKEN ? 'configured' : 'dormant',
        admin_notify_bot: config.NOTIFY_NIVA_BOT_TOKEN ? 'configured' : 'dormant',
        stranger_cam_signaling: 'healthy',
      },
    },
    system_metrics: {
      active_users: activeUsersCount,
      active_sessions: activeSessionsCount,
    },
  }, {
    status: overallStatus === 'healthy' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'X-Health-Status': overallStatus,
    },
  });
}
