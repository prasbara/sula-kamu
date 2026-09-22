import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string = config.DATABASE_PATH;
let isInitializing = false;

function ensureDatabaseReady(db: DatabaseSync, targetPath: string): void {
  if (isInitializing) return;
  isInitializing = true;
  try {
    const tableRow = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='admin_users'").get() as { count: number } | undefined;
    if (!tableRow || Number(tableRow.count) === 0) {
      initDatabase(targetPath);
    }
    const adminRow = db.prepare("SELECT count(*) as count FROM admin_users").get() as { count: number } | undefined;
    if (!adminRow || Number(adminRow.count) === 0) {
      const hash = crypto.createHash('sha256').update('SulaAdmin2026!').digest('hex');
      const insertAdmin = db.prepare(`
        INSERT OR IGNORE INTO admin_users (id, username, password_hash, display_name, role)
        VALUES (?, ?, ?, ?, ?)
      `);
      insertAdmin.run('admin-super-01', 'superadmin', hash, 'NIVA Head Admin', 'SUPER_ADMIN');
      insertAdmin.run('admin-pay-01', 'payment1', hash, 'Payment Reviewer 1', 'PAYMENT_ADMIN');
      insertAdmin.run('admin-verifier-01', 'verifier1', hash, 'Verification Admin 1', 'VERIFICATION_ADMIN');
      insertAdmin.run('admin-mod-01', 'moderator1', hash, 'Trust & Safety Moderator', 'MODERATOR');
      insertAdmin.run('admin-support-01', 'support1', hash, 'Support Specialist 1', 'SUPPORT_ADMIN');
      insertAdmin.run('admin-auditor-01', 'auditor1', hash, 'Compliance Auditor', 'AUDITOR');
    }
  } catch {
    try {
      initDatabase(targetPath);
    } catch {}
  } finally {
    isInitializing = false;
  }
}

export function getDatabase(customPath?: string): DatabaseSync {
  let targetPath = customPath || process.env.DATABASE_PATH || config.DATABASE_PATH;

  // On Vercel / serverless runtime, /var/task is read-only.
  // The only writable filesystem location is /tmp. Redirect to /tmp if running in serverless.
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless && (!targetPath.startsWith('/tmp') || targetPath.startsWith('/var/task'))) {
    targetPath = '/tmp/data/sula.db';
  }

  const dir = path.dirname(targetPath);
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {}

  if (!dbInstance || currentDbPath !== targetPath) {
    if (dbInstance) {
      try { dbInstance.close(); } catch {}
    }
    currentDbPath = targetPath;
    dbInstance = new DatabaseSync(targetPath);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');

    ensureDatabaseReady(dbInstance, targetPath);
  }
  return dbInstance;
}

export function initDatabase(customPath?: string): void {
  const db = getDatabase(customPath);

  // Run incremental column additions safely first if existing database is active
  const migrations = [
    "ALTER TABLE users ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED'",
    "ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'FREE'",
    "ALTER TABLE users ADD COLUMN onboarding_completed_at TEXT",
    "ALTER TABLE users ADD COLUMN environment TEXT NOT NULL DEFAULT 'PRODUCTION'",
    "ALTER TABLE subscriptions ADD COLUMN payment_id TEXT",
    "ALTER TABLE subscriptions ADD COLUMN plan_id TEXT",
    "ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT 'ACTIVE'",
    "ALTER TABLE subscriptions ADD COLUMN starts_at TEXT",
    "ALTER TABLE subscriptions ADD COLUMN ends_at TEXT",
    "ALTER TABLE subscriptions ADD COLUMN environment TEXT NOT NULL DEFAULT 'PRODUCTION'",
    "ALTER TABLE payment_requests ADD COLUMN environment TEXT NOT NULL DEFAULT 'PRODUCTION'",
    "ALTER TABLE support_tickets ADD COLUMN type TEXT NOT NULL DEFAULT 'PREMIUM'",
    "ALTER TABLE support_tickets ADD COLUMN assigned_admin_id TEXT",
    "ALTER TABLE support_tickets ADD COLUMN internal_notes TEXT",
    "ALTER TABLE support_tickets ADD COLUMN closed_at TEXT",
    "ALTER TABLE support_tickets ADD COLUMN environment TEXT NOT NULL DEFAULT 'PRODUCTION'",
    "ALTER TABLE admin_users ADD COLUMN totp_secret TEXT",
    "ALTER TABLE admin_users ADD COLUMN totp_enabled INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE payment_requests ADD COLUMN proof_data TEXT",
    "ALTER TABLE payment_requests ADD COLUMN proof_mime_type TEXT",
    `CREATE TABLE IF NOT EXISTS payment_proofs (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      storage_key TEXT,
      proof_data TEXT,
      mime_type TEXT NOT NULL,
      original_filename TEXT,
      size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      review_status TEXT NOT NULL DEFAULT 'PENDING',
      reviewed_by TEXT,
      reviewed_at TEXT,
      FOREIGN KEY(payment_id) REFERENCES payment_requests(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS user_exclusive_locks (
      user_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      locked_at TEXT NOT NULL DEFAULT (datetime('now')),
      released_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    // Safe chat sessions — new exclusive session model columns
    "ALTER TABLE safe_chat_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'SAFE_CHAT_WAITING'",
    "ALTER TABLE safe_chat_sessions ADD COLUMN user_a_id TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN user_b_id TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN user_a_joined_at TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN user_b_joined_at TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN active_seconds INTEGER DEFAULT 0",
    "ALTER TABLE safe_chat_sessions ADD COLUMN last_tick_at TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN last_both_active_at TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN paused_at TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN ended_at TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN end_reason TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN user_a_private_decision TEXT",
    "ALTER TABLE safe_chat_sessions ADD COLUMN user_b_private_decision TEXT",
    // User presence — add session_id column
    `CREATE TABLE IF NOT EXISTS user_presence (
      user_id TEXT PRIMARY KEY,
      session_id TEXT,
      last_heartbeat_at TEXT NOT NULL DEFAULT (datetime('now')),
      presence_status TEXT NOT NULL DEFAULT 'ACTIVE',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "ALTER TABLE user_presence ADD COLUMN session_id TEXT",
    // Notification events audit log
    `CREATE TABLE IF NOT EXISTS notification_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      user_id TEXT,
      status TEXT NOT NULL DEFAULT 'SENT',
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Stranger Cam Tables
    `CREATE TABLE IF NOT EXISTS stranger_sessions (
      id TEXT PRIMARY KEY,
      user_a_id TEXT NOT NULL,
      user_b_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      ended_at TEXT,
      end_reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS stranger_queue (
      user_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      interests TEXT DEFAULT '[]',
      entered_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS location_confirmations (
      user_id TEXT PRIMARY KEY,
      region TEXT NOT NULL DEFAULT 'SEMARANG',
      method TEXT NOT NULL,
      confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS stranger_reports (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      reporter_id TEXT NOT NULL,
      reported_user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS stranger_blocks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      blocked_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, blocked_user_id)
    )`,
    `CREATE TABLE IF NOT EXISTS stranger_safety_events (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      risk_score REAL NOT NULL DEFAULT 0.0,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS feature_waitlist (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      contact_info TEXT NOT NULL,
      feature TEXT NOT NULL DEFAULT 'STRANGER_CAM',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(contact_info, feature)
    )`,
    `CREATE TABLE IF NOT EXISTS stranger_signals (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS stranger_presence (
      user_id TEXT PRIMARY KEY,
      session_id TEXT,
      last_heartbeat TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS stranger_skips (
      user_id TEXT NOT NULL,
      skipped_user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, skipped_user_id)
    )`,
    "ALTER TABLE stranger_sessions ADD COLUMN webrtc_connected_at TEXT",
    "ALTER TABLE stranger_sessions ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    "ALTER TABLE stranger_queue ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    "CREATE INDEX IF NOT EXISTS idx_stranger_signals_lookup ON stranger_signals(session_id, receiver_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_stranger_queue_entered ON stranger_queue(entered_at)",
    "CREATE INDEX IF NOT EXISTS idx_stranger_sessions_active ON stranger_sessions(status, started_at)",
    "CREATE INDEX IF NOT EXISTS idx_stranger_skips_pair ON stranger_skips(user_id, skipped_user_id, created_at)",
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists or users table not created yet, ignore
    }
  }

  let schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'src', 'database', 'schema.sql');
  }
  if (!fs.existsSync(schemaPath)) {
    schemaPath = path.resolve(process.cwd(), 'schema.sql');
  }

  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Run migrations again after schema creation to ensure any new columns exist
  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Ignore
    }
  }

  // Ensure admin_users role constraint allows all RBAC roles
  try {
    db.prepare("INSERT INTO admin_users (id, username, password_hash, display_name, role) VALUES ('__test_rbac__', '__test_rbac__', 'hash', 'test', 'PAYMENT_ADMIN')").run();
    db.prepare("DELETE FROM admin_users WHERE id = '__test_rbac__'").run();
  } catch {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS admin_users_temp (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'PAYMENT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR', 'SUPPORT_ADMIN', 'AUDITOR', 'VERIFICATION_REVIEWER', 'SUPPORT')),
          totp_secret TEXT,
          totp_enabled INTEGER NOT NULL DEFAULT 0,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT OR IGNORE INTO admin_users_temp (id, username, password_hash, display_name, role, is_active, created_at)
        SELECT id, username, password_hash, display_name, role, is_active, created_at FROM admin_users;
        DROP TABLE admin_users;
        ALTER TABLE admin_users_temp RENAME TO admin_users;
      `);
    } catch (e) {
      console.warn('admin_users migration error:', e);
    }
  }

  // Ensure support_tickets status constraint allows OPEN and WAITING_FOR_USER
  try {
    db.prepare("INSERT INTO support_tickets (id, user_id, type, subject, status) VALUES ('__test_st__', '__test_user__', 'PREMIUM', 'test', 'OPEN')").run();
    db.prepare("DELETE FROM support_tickets WHERE id = '__test_st__'").run();
  } catch {
    try {
      db.exec(`
        CREATE TABLE IF NOT EXISTS support_tickets_temp (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL DEFAULT 'PREMIUM' CHECK(type IN ('PREMIUM', 'GENERAL', 'VERIFICATION', 'ACCOUNT')),
          subject TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'WAITING', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED')),
          priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
          assigned_admin_id TEXT,
          internal_notes TEXT,
          environment TEXT NOT NULL DEFAULT 'PRODUCTION',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          closed_at TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT OR IGNORE INTO support_tickets_temp (id, user_id, type, subject, status, priority, assigned_admin_id, internal_notes, created_at, updated_at, closed_at)
        SELECT id, user_id, type, subject, status, priority, assigned_admin_id, internal_notes, created_at, updated_at, closed_at FROM support_tickets;
        DROP TABLE support_tickets;
        ALTER TABLE support_tickets_temp RENAME TO support_tickets;
      `);
    } catch (e) {
      console.warn('support_tickets migration error:', e);
    }
  }

  // Ensure environment column is present in support_tickets
  try {
    db.exec("ALTER TABLE support_tickets ADD COLUMN environment TEXT NOT NULL DEFAULT 'PRODUCTION'");
  } catch {}
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
