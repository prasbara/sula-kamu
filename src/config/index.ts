import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
dotenv.config();

// Ensure data and uploads directories exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  BOT_MODE: process.env.BOT_MODE || 'polling',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'sula_webhook_secret',
  
  ADMIN_PORT: parseInt(process.env.ADMIN_PORT || '3000', 10),
  ADMIN_HOST: process.env.ADMIN_HOST || '0.0.0.0',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || 'sula_admin_secret_key_2026',
  
  APP_SECRET: process.env.APP_SECRET || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  DATABASE_PATH: process.env.DATABASE_PATH || path.join(DATA_DIR, 'sula.db'),
  UPLOADS_DIR: UPLOADS_DIR,
  
  MAX_VERIFICATION_ATTEMPTS: parseInt(process.env.MAX_VERIFICATION_ATTEMPTS || '3', 10),
  VERIFICATION_COOLDOWN_HOURS: parseInt(process.env.VERIFICATION_COOLDOWN_HOURS || '48', 10),
  KTM_RETENTION_HOURS: parseInt(process.env.KTM_RETENTION_HOURS || '72', 10),
  
  DAILY_LIKE_LIMIT_FREE: 30,
  REGION_SCOPE: 'Semarang',

  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  TELEGRAM_BOT_URL: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/nivasocialmakingbot',
};
