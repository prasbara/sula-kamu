import crypto from 'node:crypto';
import { getDatabase } from '../src/database/db';

async function main() {
  const db = getDatabase();
  const newPassword = process.argv[2] || 'NivaAdmin2026!';
  const hash = crypto.createHash('sha256').update(newPassword).digest('hex');

  db.prepare(`
    INSERT OR REPLACE INTO admin_users (id, username, password_hash, display_name, role, is_active, created_at)
    VALUES ('admin-super-01', 'superadmin', ?, 'NIVA Head Admin', 'SUPER_ADMIN', 1, datetime('now'))
  `).run(hash);

  console.log('✅ Admin credentials successfully reset:');
  console.log(`Username: superadmin`);
  console.log(`Password: ${newPassword}`);
  console.log(`TOTP default/master: 123456`);
}

main().catch(console.error);
