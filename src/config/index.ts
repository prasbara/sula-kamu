import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if present
dotenv.config();

// Detect serverless environment (e.g. Vercel Lambda /var/task where root is read-only)
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = process.env.DATA_DIR || (isServerless ? '/tmp/data' : path.resolve(process.cwd(), 'data'));
const UPLOADS_DIR = process.env.UPLOADS_DIR || (isServerless ? '/tmp/uploads' : path.resolve(process.cwd(), 'uploads'));

try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch {
  // Read-only serverless filesystem fallback
}

try {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch {
  // Read-only serverless filesystem fallback
}

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '8670200603:AAEHa68xll173FquoU9VLrK1Fb8m8l8Qw8E',
  NOTIFY_NIVA_BOT_TOKEN: process.env.NOTIFY_NIVA_BOT_TOKEN || '8884556017:AAEHCwt-LMTBNPRnREpRTSHqQHPeBpmT7eY',
  NOTIFY_NIVA_CHAT_ID: process.env.NOTIFY_NIVA_CHAT_ID || '5764989848',
  NOTIFY_NIVA_ENABLED: process.env.NOTIFY_NIVA_ENABLED !== 'false',
  BOT_MODE: process.env.BOT_MODE || 'polling',
  WEBHOOK_URL: process.env.WEBHOOK_URL || '',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || '',
  
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
  APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://niva.id',
  STRANGER_CAM_ENABLED: process.env.STRANGER_CAM_ENABLED !== 'false',
  STRANGER_CAM_FACE_GRACE_SECONDS: parseInt(process.env.STRANGER_CAM_FACE_GRACE_SECONDS || '3', 10),
  STRANGER_CAM_FACE_CONFIDENCE: parseFloat(process.env.STRANGER_CAM_FACE_CONFIDENCE || '0.70'),
  AI_PROVIDER: process.env.AI_PROVIDER || 'openrouter',
  AI_API_KEY: process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  AI_BASE_URL: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
  AI_MAX_TOKENS: parseInt(process.env.AI_MAX_TOKENS || '600', 10),
  AI_TIMEOUT: parseInt(process.env.AI_TIMEOUT || '15000', 10),
};
