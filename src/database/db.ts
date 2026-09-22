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
    // Always run essential migrations to ensure all columns and new tables exist
    applyEssentialMigrations(db);

    // Seed and ensure the 3 primary Superadmin accounts requested by user
    const superAdmins = [
      { id: 'admin-superadmin-1', username: 'superadmin.1', pass: 'Secmonda111', name: 'Super Admin 1' },
      { id: 'admin-superadmin-22', username: 'superadmin.22', pass: 'anjaystartupwkwkwk0', name: 'Super Admin 22' },
      { id: 'admin-superadmin-33', username: 'superadmin.33', pass: 'OTWB2BSAASBOSKU', name: 'Super Admin 33' },
    ];

    for (const sa of superAdmins) {
      const passHash = crypto.createHash('sha256').update(sa.pass).digest('hex');
      const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(sa.username) as { id: string } | undefined;
      if (existing) {
        db.prepare(`
          UPDATE admin_users 
          SET password_hash = ?, display_name = ?, role = 'SUPER_ADMIN', is_active = 1, totp_enabled = 1 
          WHERE username = ?
        `).run(passHash, sa.name, sa.username);
      } else {
        db.prepare(`
          INSERT INTO admin_users (id, username, password_hash, display_name, role, is_active, totp_enabled)
          VALUES (?, ?, ?, ?, 'SUPER_ADMIN', 1, 1)
        `).run(sa.id, sa.username, passHash, sa.name);
      }
    }

    // Role-specific operational admins for testing & separation of duty
    const defaultHash = crypto.createHash('sha256').update('SulaAdmin2026!').digest('hex');
    const operationalAdmins = [
      ['admin-super-default', 'superadmin', defaultHash, 'NIVA Head Admin', 'SUPER_ADMIN'],
      ['admin-pay-01', 'payment1', defaultHash, 'Payment Reviewer 1', 'PAYMENT_ADMIN'],
      ['admin-verifier-01', 'verifier1', defaultHash, 'Verification Admin 1', 'VERIFICATION_ADMIN'],
      ['admin-mod-01', 'moderator1', defaultHash, 'Trust & Safety Moderator', 'MODERATOR'],
      ['admin-support-01', 'support1', defaultHash, 'Support Specialist 1', 'SUPPORT_ADMIN'],
      ['admin-auditor-01', 'auditor1', defaultHash, 'Compliance Auditor', 'AUDITOR'],
    ];

    const insertAdmin = db.prepare(`
      INSERT OR IGNORE INTO admin_users (id, username, password_hash, display_name, role, is_active, totp_enabled)
      VALUES (?, ?, ?, ?, ?, 1, 1)
    `);
    for (const [id, username, hash, name, role] of operationalAdmins) {
      insertAdmin.run(id, username, hash, name, role);
    }
  } catch (err) {
    try {
      initDatabase(targetPath);
      applyEssentialMigrations(db);
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
    `CREATE TABLE IF NOT EXISTS telegram_link_tokens (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "ALTER TABLE stranger_sessions ADD COLUMN webrtc_connected_at TEXT",
    "ALTER TABLE stranger_sessions ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    "ALTER TABLE stranger_queue ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    "ALTER TABLE support_tickets ADD COLUMN telegram_chat_id TEXT",
    "ALTER TABLE support_messages ADD COLUMN telegram_message_id TEXT",
    "CREATE INDEX IF NOT EXISTS idx_stranger_signals_lookup ON stranger_signals(session_id, receiver_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_stranger_queue_entered ON stranger_queue(entered_at)",
    "CREATE INDEX IF NOT EXISTS idx_stranger_sessions_active ON stranger_sessions(status, started_at)",
    "CREATE INDEX IF NOT EXISTS idx_stranger_skips_pair ON stranger_skips(user_id, skipped_user_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_expiry ON telegram_link_tokens(expires_at, used_at)",
    "CREATE INDEX IF NOT EXISTS idx_notification_events_status ON notification_events(status, created_at)",
    // Stranger Chat & Moderation Pipeline migrations
    "ALTER TABLE stranger_sessions ADD COLUMN session_type TEXT DEFAULT 'VIDEO'",
    `CREATE TABLE IF NOT EXISTS stranger_chat_queue (
      user_id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      interests TEXT DEFAULT '[]',
      entered_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS moderation_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      message_id TEXT,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      action TEXT NOT NULL,
      strike_count INTEGER NOT NULL DEFAULT 0,
      risk_score REAL NOT NULL DEFAULT 0.0,
      evidence_snippet TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      review_status TEXT NOT NULL DEFAULT 'PENDING',
      reviewed_by TEXT,
      reviewed_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS user_restrictions (
      user_id TEXT PRIMARY KEY,
      restriction_type TEXT NOT NULL DEFAULT 'NONE',
      active_strikes INTEGER NOT NULL DEFAULT 0,
      restricted_until TEXT,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_stranger_chat_queue_entered ON stranger_chat_queue(entered_at)",
    "CREATE INDEX IF NOT EXISTS idx_mod_events_user ON moderation_events(user_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_mod_events_severity ON moderation_events(severity, review_status)",
    "CREATE INDEX IF NOT EXISTS idx_mod_events_expiry ON moderation_events(expires_at, review_status)",
    "CREATE INDEX IF NOT EXISTS idx_user_restrictions_status ON user_restrictions(restriction_type, restricted_until)",
    // Strict Semarang Geolocation Gate migrations
    "ALTER TABLE location_confirmations ADD COLUMN location_status TEXT DEFAULT 'LOCATION_VERIFIED'",
    "ALTER TABLE location_confirmations ADD COLUMN accuracy REAL",
    "ALTER TABLE location_confirmations ADD COLUMN risk_score REAL DEFAULT 0.0",
    "ALTER TABLE location_confirmations ADD COLUMN session_id TEXT",
    `CREATE TABLE IF NOT EXISTS location_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT,
      location_status TEXT NOT NULL,
      region TEXT NOT NULL,
      accuracy REAL,
      risk_score REAL NOT NULL DEFAULT 0.0,
      verified_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,
    "CREATE INDEX IF NOT EXISTS idx_loc_verif_user ON location_verifications(user_id, expires_at)",
    "CREATE INDEX IF NOT EXISTS idx_loc_verif_session ON location_verifications(session_id)",
    `CREATE TABLE IF NOT EXISTS advertising_inquiries (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      campaign_type TEXT NOT NULL,
      budget_range TEXT,
      target_audience TEXT,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW',
      internal_notes TEXT,
      assigned_admin_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    "CREATE INDEX IF NOT EXISTS idx_ad_inquiries_status ON advertising_inquiries(status)",
    "CREATE INDEX IF NOT EXISTS idx_ad_inquiries_created ON advertising_inquiries(created_at DESC)",
  ];

  for (const sql of migrations) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists or users table not created yet, ignore
    }
  }

  // Safe migration for reviews table to support HIDDEN status
  try {
    const reviewSchemaRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='reviews'").get() as { sql: string } | undefined;
    if (reviewSchemaRow && !reviewSchemaRow.sql.includes('HIDDEN')) {
      db.exec("PRAGMA foreign_keys = OFF;");
      db.exec(`
        CREATE TABLE reviews_v2 (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          display_name TEXT NOT NULL,
          rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
          review_text TEXT NOT NULL,
          recommend INTEGER NOT NULL DEFAULT 1,
          improvement_category TEXT,
          status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'HIDDEN')),
          rejection_reason TEXT,
          admin_response TEXT,
          admin_response_at TEXT,
          environment TEXT NOT NULL DEFAULT 'PRODUCTION',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        INSERT INTO reviews_v2 SELECT * FROM reviews;
        DROP TABLE reviews;
        ALTER TABLE reviews_v2 RENAME TO reviews;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
        CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
      `);
      db.exec("PRAGMA foreign_keys = ON;");
    }
  } catch (err) {
    // Already migrated or table doesn't exist yet
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

  // Run essential migrations
  applyEssentialMigrations(db);
}

export function applyEssentialMigrations(db: DatabaseSync): void {
  // 1. Ensure support_tickets columns
  const ticketCols = ['environment', 'category', 'access_token', 'contact_name', 'contact_email', 'type', 'assigned_admin_id', 'internal_notes', 'closed_at'];
  for (const col of ticketCols) {
    try {
      if (col === 'environment') {
        db.exec("ALTER TABLE support_tickets ADD COLUMN environment TEXT NOT NULL DEFAULT 'PRODUCTION'");
      } else if (col === 'category') {
        db.exec("ALTER TABLE support_tickets ADD COLUMN category TEXT NOT NULL DEFAULT 'GENERAL'");
      } else if (col === 'type') {
        db.exec("ALTER TABLE support_tickets ADD COLUMN type TEXT NOT NULL DEFAULT 'GENERAL'");
      } else {
        db.exec(`ALTER TABLE support_tickets ADD COLUMN ${col} TEXT`);
      }
    } catch {
      // Column might already exist
    }
  }

  // 2. Ensure AI Support Tables
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS ai_support_sessions (
        id TEXT PRIMARY KEY,
        ip_hash TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS ai_support_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        escalation_suggested INTEGER NOT NULL DEFAULT 0,
        suggested_category TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(session_id) REFERENCES ai_support_sessions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_ai_sess_token ON ai_support_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_ai_msg_sess ON ai_support_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_st_category ON support_tickets(category);
      CREATE INDEX IF NOT EXISTS idx_st_access_token ON support_tickets(access_token);
    `);
  } catch (e) {
    console.warn('ai_support tables migration warning:', e);
  }

  // 3. Ensure NIVA Premium Tables
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS premium_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price INTEGER NOT NULL,
        duration_days INTEGER NOT NULL,
        description TEXT,
        features TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS premium_orders (
        id TEXT PRIMARY KEY,
        public_order_id TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'IDR',
        status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(plan_id) REFERENCES premium_plans(id)
      );

      CREATE TABLE IF NOT EXISTS premium_payments (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        payment_method TEXT NOT NULL DEFAULT 'QRIS',
        amount INTEGER NOT NULL,
        paid_at TEXT,
        proof_file_id TEXT,
        proof_data TEXT,
        user_note TEXT,
        verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(verification_status IN ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED')),
        verified_by TEXT,
        verified_at TEXT,
        rejection_reason TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(order_id) REFERENCES premium_orders(id)
      );

      CREATE TABLE IF NOT EXISTS premium_subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_id TEXT NOT NULL,
        order_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'CANCELLED')),
        started_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY(plan_id) REFERENCES premium_plans(id),
        FOREIGN KEY(order_id) REFERENCES premium_orders(id)
      );

      CREATE TABLE IF NOT EXISTS payment_verification_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        admin_id TEXT,
        action TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE INDEX IF NOT EXISTS idx_prem_ord_public ON premium_orders(public_order_id);
      CREATE INDEX IF NOT EXISTS idx_prem_ord_user ON premium_orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_prem_sub_user ON premium_subscriptions(user_id);
    `);

    // Seed/update standard plans: Rp5.000 and Rp8.000 with detailed features
    const upsertPlan = db.prepare(`
      INSERT INTO premium_plans (id, name, price, duration_days, description, features, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        price = excluded.price,
        duration_days = excluded.duration_days,
        description = excluded.description,
        features = excluded.features,
        is_active = 1
    `);
    upsertPlan.run(
      'plan_starter_5k',
      'Paket NIVA 1',
      5000,
      7,
      'Akses benefit ekosistem Telegram & Akun NIVA.',
      'Limit like naik menjadi 50 like/hari di Telegram (Foto: 10 like, Foto+KTM: 30 like). Akses prioritas ekosistem Telegram & badge NIVA Premium selama 7 hari.'
    );
    upsertPlan.run(
      'plan_plus_8k',
      'Paket NIVA 2',
      8000,
      30,
      'Akses benefit ekosistem Telegram & Akun NIVA.',
      'Limit like naik menjadi 50 like/hari di Telegram (Foto: 10 like, Foto+KTM: 30 like). Akses prioritas ekosistem Telegram & badge NIVA Premium selama 30 hari.'
    );
  } catch (e) {
    console.warn('premium tables migration warning:', e);
  }

  // 4. Ensure Identity Tracking & History Tables
  try {
    try { db.exec("ALTER TABLE users ADD COLUMN telegram_username TEXT;"); } catch {}
    try { db.exec("ALTER TABLE users ADD COLUMN telegram_display_name TEXT;"); } catch {}
    try { db.exec("ALTER TABLE reports ADD COLUMN reported_username_at_time TEXT;"); } catch {}

      db.exec(`
        CREATE TABLE IF NOT EXISTS telegram_identity_history (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          telegram_id TEXT NOT NULL,
          previous_username TEXT,
          new_username TEXT,
          previous_display_name TEXT,
          new_display_name TEXT,
          change_type TEXT NOT NULL DEFAULT 'USERNAME_CHANGE',
          detected_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_tg_history_user ON telegram_identity_history(user_id);
        CREATE INDEX IF NOT EXISTS idx_tg_history_tg_id ON telegram_identity_history(telegram_id);
        CREATE INDEX IF NOT EXISTS idx_tg_history_prev_user ON telegram_identity_history(previous_username);
        CREATE INDEX IF NOT EXISTS idx_tg_history_new_user ON telegram_identity_history(new_username);
      `);
    } catch (e) {
      console.warn('identity tracking migration warning:', e);
    }

    // 5. Ensure Bot Matchmaking, 20-Min Sessions & Chat Messages Tables
    try {
      try { db.exec("ALTER TABLE users ADD COLUMN telegram_username TEXT;"); } catch {}
      try { db.exec("ALTER TABLE users ADD COLUMN telegram_display_name TEXT;"); } catch {}
      try { db.exec("ALTER TABLE users ADD COLUMN bot_state TEXT NOT NULL DEFAULT 'NEW';"); } catch {}
      try { db.exec("ALTER TABLE users ADD COLUMN last_seen_at TEXT;"); } catch {}
      try { db.exec("ALTER TABLE users ADD COLUMN online_status TEXT NOT NULL DEFAULT 'OFFLINE';"); } catch {}
      try { db.exec("ALTER TABLE users ADD COLUMN active_session_id TEXT;"); } catch {}

      db.exec(`
        CREATE TABLE IF NOT EXISTS match_queue (
          id TEXT PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          status TEXT NOT NULL DEFAULT 'SEARCHING' CHECK(status IN ('SEARCHING', 'MATCHED', 'CANCELLED')),
          entered_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_heartbeat TEXT NOT NULL DEFAULT (datetime('now')),
          metadata TEXT,
          FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS match_sessions (
          id TEXT PRIMARY KEY,
          user_a_id TEXT NOT NULL,
          user_b_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'COMPLETED', 'USER_ENDED', 'OFFLINE_TIMEOUT', 'REPORTED', 'BLOCKED')),
          started_at TEXT NOT NULL DEFAULT (datetime('now')),
          expires_at TEXT NOT NULL,
          ended_at TEXT,
          ended_reason TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(user_a_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(user_b_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS match_session_messages (
          id TEXT PRIMARY KEY,
          session_id TEXT NOT NULL,
          sender_user_id TEXT NOT NULL,
          receiver_user_id TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY(session_id) REFERENCES match_sessions(id) ON DELETE CASCADE,
          FOREIGN KEY(sender_user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY(receiver_user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notification_queue (
          id TEXT PRIMARY KEY,
          event_type TEXT NOT NULL,
          payload TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'FAILED', 'RETRY')),
          retry_count INTEGER NOT NULL DEFAULT 0,
          error_message TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          sent_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_mq_status_time ON match_queue(status, entered_at);
        CREATE INDEX IF NOT EXISTS idx_mq_heartbeat ON match_queue(last_heartbeat);
        CREATE INDEX IF NOT EXISTS idx_ms_users ON match_sessions(user_a_id, user_b_id);
        CREATE INDEX IF NOT EXISTS idx_ms_status ON match_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_ms_expiry ON match_sessions(expires_at, status);
        CREATE INDEX IF NOT EXISTS idx_msm_session ON match_session_messages(session_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_nq_status ON notification_queue(status, created_at);
      `);
    } catch (e) {
      console.warn('bot matchmaking migration warning:', e);
    }
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
