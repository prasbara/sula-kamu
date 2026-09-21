import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string = config.DATABASE_PATH;

export function getDatabase(customPath?: string): DatabaseSync {
  const targetPath = customPath || process.env.DATABASE_PATH || config.DATABASE_PATH;
  if (!dbInstance || currentDbPath !== targetPath) {
    if (dbInstance) {
      try { dbInstance.close(); } catch {}
    }
    currentDbPath = targetPath;
    dbInstance = new DatabaseSync(targetPath);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
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
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists or users table not created yet, ignore
    }
  }

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  db.exec(schemaSql);

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
