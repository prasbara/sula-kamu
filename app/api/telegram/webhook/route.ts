import { NextRequest } from 'next/server';
import { webhookCallback } from 'grammy';
import { createBot } from '@/src/bot/index';
import { createAdminNotifyBot } from '@/src/bot/adminNotifyBot';
import { config } from '@/src/config/index';
import { getDatabase } from '@/src/database/db';
import { ServerlessRateLimiter } from '@/src/services/security/serverlessRateLimiter';

export const dynamic = 'force-dynamic';

let userBotHandler: any = null;
let adminBotHandler: any = null;

function getUserHandler() {
  if (!userBotHandler) {
    const bot = createBot();
    userBotHandler = webhookCallback(bot, 'std/http');
  }
  return userBotHandler;
}

function getAdminHandler() {
  if (!adminBotHandler) {
    const bot = createAdminNotifyBot();
    adminBotHandler = webhookCallback(bot, 'std/http');
  }
  return adminBotHandler;
}

export async function POST(req: NextRequest) {
  // 1. Webhook Secret Validation
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (config.WEBHOOK_SECRET && (!secret || secret !== config.WEBHOOK_SECRET)) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_WEBHOOK_SECRET' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Persistent Rate Limiting Protection (Generous: 120 req/min)
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'webhook_client';
  const rateCheck = ServerlessRateLimiter.checkLimit(`webhook:${clientIp}`, 120, 60);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({ error: 'RATE_LIMIT_EXCEEDED' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const url = new URL(req.url);
  const botParam = url.searchParams.get('bot');
  const botType = botParam === 'admin' ? 'ADMIN' : 'USER';

  // 3. Webhook Idempotency & Deduplication via update_id
  let updateId: number | null = null;
  try {
    const cloned = req.clone();
    const body = await cloned.json();
    if (body && typeof body.update_id === 'number') {
      updateId = body.update_id;
    }
  } catch {}

  if (updateId !== null) {
    try {
      const db = getDatabase();
      const existing = db.prepare('SELECT update_id FROM telegram_processed_updates WHERE update_id = ?').get(updateId) as { update_id: number } | undefined;
      
      if (existing) {
        // Return 200 OK immediately to stop Telegram retry storm
        return new Response(JSON.stringify({ status: 'ALREADY_PROCESSED', update_id: updateId }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Record update_id into processed updates log
      db.prepare(`
        INSERT INTO telegram_processed_updates (update_id, bot_type, processed_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(update_id) DO NOTHING
      `).run(updateId, botType);
    } catch (e) {
      console.warn('[Telegram Webhook Idempotency Check Error]:', e);
    }
  }

  // 4. Execute Bot Handler with 25-Second Serverless Timeout Protection
  try {
    const handler = botParam === 'admin' ? getAdminHandler() : getUserHandler();
    
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('WEBHOOK_HANDLER_TIMEOUT')), 25000);
    });

    return await Promise.race([handler(req), timeoutPromise]);
  } catch (err: any) {
    console.error(`[Telegram Webhook Error][${botType}]:`, err);
    if (err.message === 'WEBHOOK_HANDLER_TIMEOUT') {
      // Return 200 so Telegram does not trigger an exponential retry loop
      return new Response(JSON.stringify({ status: 'TIMEOUT_ACCEPTED', message: 'Processed with latency' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'INTERNAL_WEBHOOK_ERROR', message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function GET() {
  return new Response(JSON.stringify({
    status: 'ACTIVE',
    service: 'NIVA Telegram Webhook Router',
    persistence: 'DATABASE_BACKED',
    idempotency: 'ENABLED',
    endpoints: {
      userBot: '/api/telegram/webhook',
      adminBot: '/api/telegram/webhook?bot=admin',
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
