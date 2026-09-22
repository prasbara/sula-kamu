import { NextRequest } from 'next/server';
import { webhookCallback } from 'grammy';
import { createBot } from '@/src/bot/index';
import { createAdminNotifyBot } from '@/src/bot/adminNotifyBot';
import { config } from '@/src/config/index';

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
  const secret = req.headers.get('x-telegram-bot-api-secret-token');
  if (config.WEBHOOK_SECRET && secret && secret !== config.WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ error: 'UNAUTHORIZED_WEBHOOK_SECRET' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const botParam = url.searchParams.get('bot');

  try {
    if (botParam === 'admin') {
      const handler = getAdminHandler();
      return await handler(req);
    }

    const handler = getUserHandler();
    return await handler(req);
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err);
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
    endpoints: {
      userBot: '/api/telegram/webhook',
      adminBot: '/api/telegram/webhook?bot=admin',
    },
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
