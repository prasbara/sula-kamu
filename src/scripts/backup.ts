import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const PROD_DB_PATH = path.resolve(DATA_DIR, 'sula.db');
const MAX_BACKUPS_RETAINED = 7;

export function runDatabaseBackup(): { backupPath: string; verified: boolean; error?: string } {
  if (!fs.existsSync(PROD_DB_PATH)) {
    throw new Error(`Production database not found at ${PROD_DB_PATH}`);
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `sula_backup_${timestamp}.db`;
  const backupPath = path.resolve(BACKUP_DIR, backupFileName);

  console.log(`[BACKUP] Initiating live consistent snapshot into: ${backupFileName}`);
  
  // Use SQLite VACUUM INTO for atomic live snapshot without locking or corrupting live reads
  const prodDb = new DatabaseSync(PROD_DB_PATH, { readOnly: true });
  try {
    prodDb.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}';`);
  } finally {
    prodDb.close();
  }

  // Verify integrity of the backup file
  console.log(`[BACKUP] Verifying integrity of backup file...`);
  const backupDb = new DatabaseSync(backupPath, { readOnly: true });
  let verified = false;
  try {
    const integrity = backupDb.prepare('PRAGMA integrity_check;').all() as Array<{ integrity_check: string }>;
    if (integrity.length > 0 && integrity[0].integrity_check === 'ok') {
      verified = true;
      console.log(`[BACKUP] Verification check PASSED: PRAGMA integrity_check = ok`);
    } else {
      console.error(`[BACKUP] Verification FAILED:`, integrity);
    }
  } finally {
    backupDb.close();
  }

  // Apply retention policy
  applyRetentionPolicy();

  return { backupPath, verified };
}

export function verifyRestore(backupPath: string): { restored: boolean; recordCounts: Record<string, number> } {
  const restoreTestPath = path.resolve(DATA_DIR, 'sula_restore_test.db');
  if (fs.existsSync(restoreTestPath)) {
    fs.unlinkSync(restoreTestPath);
  }

  console.log(`[RESTORE TEST] Restoring backup to isolated environment: ${restoreTestPath}`);
  fs.copyFileSync(backupPath, restoreTestPath);

  const restoredDb = new DatabaseSync(restoreTestPath, { readOnly: true });
  const counts: Record<string, number> = {};
  let restored = false;

  try {
    const check = restoredDb.prepare('PRAGMA integrity_check;').all() as Array<{ integrity_check: string }>;
    if (check[0]?.integrity_check === 'ok') {
      const tables = ['users', 'profiles', 'subscriptions', 'payment_requests', 'support_tickets', 'reviews'];
      for (const t of tables) {
        try {
          const row = restoredDb.prepare(`SELECT COUNT(*) as count FROM ${t}`).get() as { count: number };
          counts[t] = Number(row.count);
        } catch {
          counts[t] = -1;
        }
      }
      restored = true;
      console.log(`[RESTORE TEST] Integrity verified. Restored record counts:`, counts);
    }
  } finally {
    restoredDb.close();
    if (fs.existsSync(restoreTestPath)) {
      fs.unlinkSync(restoreTestPath);
      console.log(`[RESTORE TEST] Cleaned up temporary restore test database.`);
    }
  }

  return { restored, recordCounts: counts };
}

function applyRetentionPolicy() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('sula_backup_') && f.endsWith('.db'))
    .map(f => ({
      name: f,
      fullPath: path.resolve(BACKUP_DIR, f),
      time: fs.statSync(path.resolve(BACKUP_DIR, f)).mtimeMs
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > MAX_BACKUPS_RETAINED) {
    const toRemove = files.slice(MAX_BACKUPS_RETAINED);
    for (const item of toRemove) {
      console.log(`[BACKUP RETENTION] Removing old backup: ${item.name}`);
      fs.unlinkSync(item.fullPath);
    }
  }
}

// Run if called directly
const res = runDatabaseBackup();
console.log(`Backup completed: ${res.backupPath} (Verified: ${res.verified})`);
const restoreRes = verifyRestore(res.backupPath);
console.log(`Restore verification: ${restoreRes.restored ? 'SUCCESS' : 'FAILURE'}`);
