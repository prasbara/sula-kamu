import { config } from './config/index.js';
import { initDatabase } from './database/db.js';
import { seedDatabase } from './database/seed.js';
import { createBot } from './bot/index.js';
import { createAdminNotifyBot } from './bot/adminNotifyBot.js';
import { startAdminServer } from './admin/server.js';

async function main() {
  console.log('----------------------------------------------------');
  console.log('SULA — Student Social & Matchmaking Platform');
  console.log('Serving the Semarang Higher-Education Ecosystem');
  console.log('----------------------------------------------------');

  // 1. Initialize & Seed Database
  console.log('[1/3] Initializing SQLite database and Semarang institutions...');
  initDatabase();
  seedDatabase();
  console.log('[1/3] Database ready.');

  // 2. Start Admin Console
  console.log('[2/3] Starting Admin & Incident Response Console...');
  startAdminServer();

  // 3. Start Telegram Bots
  console.log('[3/3] Checking Telegram Bot configuration...');
  if (config.TELEGRAM_BOT_TOKEN && config.TELEGRAM_BOT_TOKEN !== 'your_bot_token_here') {
    const bot = createBot();
    console.log('🤖 Telegram Main Bot starting in polling mode...');
    bot.start({
      onStart: (botInfo) => {
        console.log(`🤖 Main Bot active as @${botInfo.username}`);
      },
    }).catch((e) => console.warn('Main Bot polling warning:', e.message));
  } else {
    console.log('ℹ️ TELEGRAM_BOT_TOKEN not configured in .env yet.');
  }

  if (config.NOTIFY_NIVA_BOT_TOKEN && config.NOTIFY_NIVA_BOT_TOKEN !== 'your_notify_bot_token_here') {
    const notifyBot = createAdminNotifyBot();
    console.log('🛡 NIVANotify Bot starting in polling mode...');
    notifyBot.start({
      onStart: (botInfo) => {
        console.log(`🛡 NIVANotify Bot active as @${botInfo.username}`);
      },
    }).catch((e) => console.warn('Notify Bot polling warning:', e.message));
  }
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
