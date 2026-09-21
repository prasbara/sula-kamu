import { getDatabase, initDatabase } from '../database/db';

export interface CleanupReport {
  totalUsersBefore: number;
  testUsersRemoved: number;
  realUsersPreserved: number;
  testPaymentsRemoved: number;
  testSubscriptionsRemoved: number;
  testSupportTicketsRemoved: number;
  testVerificationAttemptsRemoved: number;
  testMatchesRemoved: number;
  testReviewsRemoved: number;
  preservedUsers: Array<{ id: string; telegram_id: string; display_name?: string }>;
}

export function runDataCleanup(): CleanupReport {
  initDatabase();
  const db = getDatabase();

  const totalUsersBefore = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;

  // 1. Identify test users by synthetic test patterns
  const testUsers = db.prepare(`
    SELECT id, telegram_id FROM users
    WHERE telegram_id LIKE 'test-%'
       OR telegram_id LIKE 'pay-%'
       OR telegram_id LIKE 'promo-%'
       OR telegram_id LIKE 'tg-%'
       OR telegram_id LIKE 'photoverif-%'
       OR telegram_id LIKE 'ktmverif-%'
       OR telegram_id LIKE 'target-%'
       OR telegram_id LIKE 'stats-user-%'
       OR telegram_id LIKE 'unverif-%'
       OR telegram_id LIKE '__test_%'
       OR telegram_id LIKE 'user-%'
  `).all() as Array<{ id: string; telegram_id: string }>;

  const testUserIds = testUsers.map(u => u.id);
  let testPaymentsRemoved = 0;
  let testSubscriptionsRemoved = 0;
  let testSupportTicketsRemoved = 0;
  let testVerificationAttemptsRemoved = 0;
  let testMatchesRemoved = 0;
  let testReviewsRemoved = 0;

  if (testUserIds.length > 0) {
    db.exec('BEGIN TRANSACTION;');
    try {
      for (const uid of testUserIds) {
        // Count and delete payment requests
        const prCount = (db.prepare('SELECT COUNT(*) as c FROM payment_requests WHERE user_id = ?').get(uid) as { c: number }).c;
        testPaymentsRemoved += prCount;
        db.prepare('DELETE FROM payment_requests WHERE user_id = ?').run(uid);

        // Count and delete subscriptions
        const subCount = (db.prepare('SELECT COUNT(*) as c FROM subscriptions WHERE user_id = ?').get(uid) as { c: number }).c;
        testSubscriptionsRemoved += subCount;
        db.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(uid);

        // Count and delete support tickets and messages
        const stCount = (db.prepare('SELECT COUNT(*) as c FROM support_tickets WHERE user_id = ?').get(uid) as { c: number }).c;
        testSupportTicketsRemoved += stCount;
        db.prepare(`
          DELETE FROM support_messages 
          WHERE ticket_id IN (SELECT id FROM support_tickets WHERE user_id = ?)
        `).run(uid);
        db.prepare('DELETE FROM support_tickets WHERE user_id = ?').run(uid);

        // Bridge tokens
        db.prepare('DELETE FROM bridge_tokens WHERE user_id = ?').run(uid);

        // Verification records
        const verifCount = (db.prepare('SELECT COUNT(*) as c FROM verification_attempts WHERE user_id = ?').get(uid) as { c: number }).c;
        testVerificationAttemptsRemoved += verifCount;
        db.prepare('DELETE FROM verification_attempts WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM photo_verifications WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM student_verifications WHERE user_id = ?').run(uid);

        // Likes & matches
        db.prepare('DELETE FROM daily_like_usage WHERE user_id = ?').run(uid);
        db.prepare('DELETE FROM likes WHERE from_user_id = ? OR to_user_id = ?').run(uid, uid);
        const matchCount = (db.prepare('SELECT COUNT(*) as c FROM matches WHERE user_a_id = ? OR user_b_id = ?').get(uid, uid) as { c: number }).c;
        testMatchesRemoved += matchCount;
        db.prepare('DELETE FROM matches WHERE user_a_id = ? OR user_b_id = ?').run(uid, uid);

        // Delete user
        db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      }

      // Cleanup test login attempts
      db.prepare(`
        DELETE FROM login_attempts 
        WHERE username LIKE 'admin_%' 
           OR username LIKE 'active_%' 
           OR username LIKE 'secadmin_%'
           OR ip_address LIKE '192.168.%'
      `).run();

      // Cleanup test admin users
      db.prepare(`
        DELETE FROM admin_users 
        WHERE username LIKE 'admin_%' 
           OR username LIKE 'active_%' 
           OR username LIKE '__test_%'
      `).run();

      // Update public statistics singleton with actual count of real users
      const realUserCount = (db.prepare("SELECT COUNT(*) as c FROM users WHERE status != 'BANNED'").get() as { c: number }).c;
      db.prepare(`
        UPDATE public_statistics 
        SET students_joined_total = ?, updated_at = datetime('now') 
        WHERE id = 'singleton'
      `).run(realUserCount);

      // Ensure all remaining real records have environment = 'PRODUCTION'
      db.prepare("UPDATE users SET environment = 'PRODUCTION' WHERE environment IS NULL OR environment = ''").run();
      db.prepare("UPDATE payment_requests SET environment = 'PRODUCTION' WHERE environment IS NULL OR environment = ''").run();
      db.prepare("UPDATE subscriptions SET environment = 'PRODUCTION' WHERE environment IS NULL OR environment = ''").run();
      db.prepare("UPDATE support_tickets SET environment = 'PRODUCTION' WHERE environment IS NULL OR environment = ''").run();

      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  // Fetch remaining preserved users
  const preservedUsers = db.prepare(`
    SELECT u.id, u.telegram_id, p.display_name 
    FROM users u 
    LEFT JOIN profiles p ON p.user_id = u.id
  `).all() as Array<{ id: string; telegram_id: string; display_name?: string }>;

  return {
    totalUsersBefore,
    testUsersRemoved: testUserIds.length,
    realUsersPreserved: preservedUsers.length,
    testPaymentsRemoved,
    testSubscriptionsRemoved,
    testSupportTicketsRemoved,
    testVerificationAttemptsRemoved,
    testMatchesRemoved,
    testReviewsRemoved,
    preservedUsers,
  };
}

if (process.argv[1] && process.argv[1].endsWith('cleanupTestData.ts')) {
  const report = runDataCleanup();
  console.log('=============================================');
  console.log('TEST DATA CLEANUP REPORT');
  console.log('=============================================');
  console.log(`Users found before cleanup:      ${report.totalUsersBefore}`);
  console.log(`Test users removed:              ${report.testUsersRemoved}`);
  console.log(`Real users preserved:            ${report.realUsersPreserved}`);
  console.log(`Test payments removed:           ${report.testPaymentsRemoved}`);
  console.log(`Test subscriptions removed:      ${report.testSubscriptionsRemoved}`);
  console.log(`Test support tickets removed:    ${report.testSupportTicketsRemoved}`);
  console.log(`Test verifications removed:      ${report.testVerificationAttemptsRemoved}`);
  console.log(`Test matches removed:            ${report.testMatchesRemoved}`);
  console.log('Preserved Real Accounts:');
  report.preservedUsers.forEach(u => {
    console.log(` - ID: ${u.id} | Telegram: ${u.telegram_id} | Name: ${u.display_name || '(No profile)'}`);
  });
  console.log('=============================================');
}
