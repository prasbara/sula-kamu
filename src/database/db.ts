import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(config.DATABASE_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

export function initDatabase(): void {
  const db = getDatabase();

  // Run incremental column additions safely first if existing database is active
  const migrations = [
    "ALTER TABLE users ADD COLUMN verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED'",
    "ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'FREE'",
    "ALTER TABLE users ADD COLUMN onboarding_completed_at TEXT",
    "ALTER TABLE subscriptions ADD COLUMN payment_id TEXT",
    "ALTER TABLE subscriptions ADD COLUMN plan_id TEXT",
    "ALTER TABLE subscriptions ADD COLUMN status TEXT DEFAULT 'ACTIVE'",
    "ALTER TABLE subscriptions ADD COLUMN starts_at TEXT",
    "ALTER TABLE subscriptions ADD COLUMN ends_at TEXT",
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
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
