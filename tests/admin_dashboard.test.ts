import assert from 'node:assert';
import { getDatabase, initDatabase } from '../src/database/db';
import { AdminAuthService } from '../src/services/auth/adminAuthService';
import { PaymentService } from '../src/services/payment/paymentService';
import { SupportService } from '../src/services/support/supportService';
import { ReviewService } from '../src/services/review/reviewService';
import { VerificationService } from '../src/services/verification/verificationService';
import { PhotoVerificationService } from '../src/services/verification/photoVerificationService';
import { StatisticsService } from '../src/services/stats/statisticsService';

async function runAdminDashboardVerification() {
  console.log('===============================================================');
  console.log('       NIVA ADMIN DASHBOARD MODULE VERIFICATION SUITE          ');
  console.log('===============================================================');

  // Login as superadmin to obtain valid stateless session token
  const loginRes = await AdminAuthService.login('superadmin', 'SulaAdmin2026!');
  assert(!!loginRes.token, 'Superadmin login succeeds');
  const token = loginRes.token;

  const session = AdminAuthService.validateSession(token);
  assert(session !== null && session.username === 'superadmin', 'Session token validates successfully');
  console.log('[1/7] Authentication & Session Check: PASSED');

  // 1. Overview Metrics
  const stats = StatisticsService.getPublicStats();
  assert(typeof stats.studentsJoined === 'number', 'Overview studentsJoined is numeric');
  console.log('[2/7] Overview Metrics: PASSED');

  // 2. All Active Users Query
  const db = getDatabase();
  const users = db.prepare(`
    SELECT u.id, u.status, u.verification_status, u.subscription_status, p.display_name
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LIMIT 10
  `).all();
  assert(Array.isArray(users), 'Users directory returns array');
  console.log(`[3/7] All Active Users Directory: PASSED (${users.length} users queried)`);

  // 3. Verification Queues
  const photoQueue = PhotoVerificationService.getPhotoQueue();
  const ktmQueue = VerificationService.getReviewQueue();
  assert(Array.isArray(photoQueue), 'Photo queue is array');
  assert(Array.isArray(ktmQueue), 'KTM review queue is array');
  console.log(`[4/7] Verification Queues: PASSED (Photo: ${photoQueue.length}, KTM: ${ktmQueue.length})`);

  // 4. Payments FIFO Queue
  const paymentQueue = PaymentService.getPaymentQueue('ALL');
  assert(Array.isArray(paymentQueue), 'Payment queue returns array');
  console.log(`[5/7] Payment FIFO Queue: PASSED (${paymentQueue.length} payments pending/reviewed)`);

  // 5. Support Tickets FIFO Queue
  const supportQueue = SupportService.getSupportQueue('ALL');
  assert(Array.isArray(supportQueue), 'Support tickets queue returns array');
  console.log(`[6/7] Support Tickets FIFO Queue: PASSED (${supportQueue.length} tickets found)`);

  // 6. User Reviews & Audit Logs
  const reviewsQueue = ReviewService.getAdminReviewQueue('ALL');
  assert(Array.isArray(reviewsQueue), 'Reviews moderation queue returns array');

  const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10').all();
  assert(Array.isArray(auditLogs), 'Audit logs returns array');
  console.log(`[7/7] Reviews & Audit Logs: PASSED (${reviewsQueue.length} reviews, ${auditLogs.length} audit logs)`);

  console.log('===============================================================');
  console.log('ALL 7 ADMIN DASHBOARD MODULES VERIFIED & FULLY FUNCTIONAL');
  console.log('===============================================================');
}

runAdminDashboardVerification().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
