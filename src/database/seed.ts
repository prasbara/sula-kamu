import { getDatabase, initDatabase, ensureInstitutionsSeeded } from './db.js';
import crypto from 'node:crypto';

export function seedDatabase(customPath?: string): void {
  initDatabase(customPath);
  const db = getDatabase(customPath);

  // 1. Seed Institutions (All 33 Semarang Institutions)
  ensureInstitutionsSeeded(db);

  // 2. Seed Emergency Switches & Product Configurations
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO system_settings (key, value, description)
    VALUES (?, ?, ?)
  `);
  insertSetting.run('registrations_enabled', 'true', 'Global kill switch for new registrations');
  insertSetting.run('matchmaking_enabled', 'true', 'Global switch to pause matchmaking discovery');
  insertSetting.run('verification_enabled', 'true', 'Global switch for KTM verification uploads');
  insertSetting.run('pricing_phase', 'EARLY_ACCESS', 'Active subscription pricing phase (EARLY_ACCESS, EARLY_LAUNCH, NORMAL)');

  // 3. Seed Public Statistics Singleton
  db.exec(`
    INSERT OR IGNORE INTO public_statistics (id, students_joined_total, updated_at)
    VALUES ('singleton', (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'), datetime('now'));
  `);

  // 4. Seed Subscription Plans
  const insertPlan = db.prepare(`
    INSERT OR IGNORE INTO subscription_plans (id, name, price, duration_days, badge_label, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertPlan.run('early_access', 'Early Access', 5000, 30, 'EARLY ACCESS');
  insertPlan.run('early_launch', 'Early Launch', 8000, 30, 'EARLY LAUNCH');

  // 5. Seed Admin Users (with SHA-256 hashed passwords)
  const adminCountStmt = db.prepare('SELECT COUNT(*) as count FROM admin_users');
  const adminCount = adminCountStmt.get() as { count: number };

  if (adminCount.count === 0) {
    const insertAdmin = db.prepare(`
      INSERT INTO admin_users (id, username, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Standard hash for seed admin accounts (Default seed: 'SulaAdmin2026!')
    const hash = crypto.createHash('sha256').update('SulaAdmin2026!').digest('hex');

    insertAdmin.run('admin-super-01', 'superadmin', hash, 'NIVA Head Admin', 'SUPER_ADMIN');
    insertAdmin.run('admin-pay-01', 'payment1', hash, 'Payment Reviewer 1', 'PAYMENT_ADMIN');
    insertAdmin.run('admin-verifier-01', 'verifier1', hash, 'Verification Admin 1', 'VERIFICATION_ADMIN');
    insertAdmin.run('admin-mod-01', 'moderator1', hash, 'Trust & Safety Moderator', 'MODERATOR');
    insertAdmin.run('admin-support-01', 'support1', hash, 'Support Specialist 1', 'SUPPORT_ADMIN');
    insertAdmin.run('admin-auditor-01', 'auditor1', hash, 'Compliance Auditor', 'AUDITOR');
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  seedDatabase();
  console.log('Database successfully initialized and seeded with 33 Semarang institutions, statistics, plans, and admin roles.');
}
