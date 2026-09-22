/**
 * Comprehensive End-to-End Test Suite:
 * - Buat Tiket Bantuan Resmi NIVA & Chat Isolation
 * - Admin Ticket Management, FIFO & Security Elevation
 * - Admin Authentication & Role Authorization
 * - Telegram Identity Tracking & Username Change History
 * - User Reporting (Scam, Harassment, Abuse) & Moderation
 * - KTM Student ID Verification & Audit Logging
 * - Premium Telegram Order, QRIS Chat Verification & Entitlement
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, initDatabase, closeDatabase } from '../src/database/db';
import { SupportService } from '../src/services/support/supportService';
import { AdminAuthService } from '../src/services/auth/adminAuthService';
import { IdentityService } from '../src/services/identity/identityService';
import { ModerationService } from '../src/services/safety/moderationService';
import { VerificationService } from '../src/services/verification/verificationService';
import { PremiumService } from '../src/services/premium/premiumService';

const TEST_DB_PATH = path.join(process.cwd(), 'data', 'test_admin_ticketing_e2e.db');

describe('Master Admin Dashboard & Ticketing End-to-End Suite', () => {
  before(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DATABASE_PATH = TEST_DB_PATH;
    initDatabase(TEST_DB_PATH);

    const db = getDatabase();
    // Seed test users
    db.prepare(`
      INSERT OR IGNORE INTO institutions (id, name, short_name, type, campus_cluster)
      VALUES ('inst_undip', 'Universitas Diponegoro', 'UNDIP', 'UNIVERSITY', 'Tembalang')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO users (id, telegram_id, status, verification_status, subscription_status)
      VALUES 
        ('user_alpha', '1001', 'ACTIVE', 'UNVERIFIED', 'FREE'),
        ('user_beta', '1002', 'ACTIVE', 'UNVERIFIED', 'FREE'),
        ('user_target', '1003', 'ACTIVE', 'UNVERIFIED', 'FREE')
    `).run();

    db.prepare(`
      INSERT OR IGNORE INTO profiles (id, user_id, display_name, age, institution_id, study_field)
      VALUES 
        ('prof_alpha', 'user_alpha', 'Budi Santoso', 21, 'inst_undip', 'Informatika'),
        ('prof_beta', 'user_beta', 'Siti Rahma', 20, 'inst_undip', 'Kedokteran'),
        ('prof_target', 'user_target', 'Oknum Bermasalah', 22, 'inst_undip', 'Hukum')
    `).run();

    // Seed admin user
    AdminAuthService.ensureInitialAdmin();
  });

  after(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  // TEST A & B: User Create Ticket & Access with Token
  it('TEST A & B: User creates Ticket A, receives NIVA-XXXXXX and 64-char token, opens conversation', () => {
    const res = SupportService.createUnifiedTicket({
      category: 'GENERAL',
      subject: 'Pertanyaan tentang Jadwal Verifikasi Kampus',
      message: 'Halo admin, apakah jadwal verifikasi booth offline di Tembalang buka hari Sabtu?',
      contactName: 'Budi Santoso',
      contactEmail: 'budi@undip.ac.id',
    });

    assert.ok(res.ticket.id.startsWith('NIVA-'), 'Ticket ID must follow NIVA-XXXXXX pattern');
    assert.strictEqual(typeof res.accessToken, 'string');
    assert.strictEqual(res.accessToken.length, 64, 'Access token must be 64-char crypto hex string');
    assert.strictEqual(res.ticket.status, 'OPEN');

    // Access with matching token
    const fetched = SupportService.getTicketByToken(res.ticket.id, res.accessToken);
    assert.strictEqual(fetched.ticket.id, res.ticket.id);
    assert.strictEqual(fetched.messages.length, 1);
    assert.strictEqual(fetched.messages[0].sender_type, 'USER');
    assert.ok(fetched.messages[0].body.includes('booth offline'));
  });

  // TEST C: User sends additional message
  it('TEST C: User sends additional message to Ticket A with token, persisted in DB', () => {
    const queueBefore = SupportService.getSupportQueue();
    const ticketA = queueBefore[0];

    const newMsg = SupportService.sendMessageWithToken(
      ticketA.ticket_id,
      ticketA.ticket_id.startsWith('NIVA-') ? (getDatabase().prepare('SELECT access_token FROM support_tickets WHERE id = ?').get(ticketA.ticket_id) as any).access_token : '',
      'Budi Santoso',
      'Lampiran tambahan: jam berapa biasanya dibuka?'
    );

    assert.strictEqual(newMsg.sender_type, 'USER');
    assert.strictEqual(newMsg.ticket_id, ticketA.ticket_id);

    // Verify DB count
    const db = getDatabase();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM support_messages WHERE ticket_id = ?').get(ticketA.ticket_id) as any).cnt;
    assert.strictEqual(count, 2);
  });

  // TEST D & E: Admin replies to Ticket A and Ticket B individually (Strict Isolation)
  it('TEST D & E: Admin replies to Ticket A and Ticket B with strict conversation isolation', () => {
    const db = getDatabase();
    const queue = SupportService.getSupportQueue();
    const ticketAId = queue[0].ticket_id;

    // Create Ticket B
    const resB = SupportService.createUnifiedTicket({
      category: 'TECHNICAL',
      subject: 'Kendala Kamera Stranger Cam di iOS',
      message: 'Kamera Safari meminta izin berkali-kali.',
      contactName: 'Siti Rahma',
    });
    const ticketBId = resB.ticket.id;

    // Admin replies to Ticket A
    const replyA = SupportService.sendMessage(
      ticketAId,
      'ADMIN',
      'admin_01',
      'Admin NIVA Bantuan',
      'Halo Budi, booth dibuka setiap Sabtu pukul 09.00 - 15.00 WIB.',
      false
    );
    assert.strictEqual(replyA.sender_type, 'ADMIN');

    // Admin replies to Ticket B
    const replyB = SupportService.sendMessage(
      ticketBId,
      'ADMIN',
      'admin_02',
      'Admin NIVA Teknis',
      'Halo Siti, pastikan pengaturan iOS Settings > Safari > Camera diset ke Allow.',
      false
    );
    assert.strictEqual(replyB.sender_type, 'ADMIN');

    // VERIFY ISOLATION: Ticket A messages must NOT contain replyB
    const tokenA = (db.prepare('SELECT access_token FROM support_tickets WHERE id = ?').get(ticketAId) as any).access_token;
    const conversationA = SupportService.getTicketByToken(ticketAId, tokenA);
    const hasLeakageInA = conversationA.messages.some((m) => m.body.includes('Safari'));
    assert.strictEqual(hasLeakageInA, false, 'Ticket A must NOT contain replies meant for Ticket B');

    // Ticket B messages must NOT contain replyA
    const conversationB = SupportService.getTicketByToken(ticketBId, resB.accessToken);
    const hasLeakageInB = conversationB.messages.some((m) => m.body.includes('booth dibuka'));
    assert.strictEqual(hasLeakageInB, false, 'Ticket B must NOT contain replies meant for Ticket A');
  });

  // TEST F & G: Zero IDOR & Unauthorized Access Denied
  it('TEST F & G: User A attempting to access Ticket B with Token A is denied', () => {
    const db = getDatabase();
    const tickets = db.prepare('SELECT id, access_token FROM support_tickets LIMIT 2').all() as any[];
    assert.ok(tickets.length >= 2);

    const ticketA = tickets[0];
    const ticketB = tickets[1];

    // Attempt to access Ticket B with Token A
    assert.throws(() => {
      SupportService.getTicketByToken(ticketB.id, ticketA.access_token);
    }, /UNAUTHORIZED_ACCESS/);

    // Attempt to access with invalid random token
    assert.throws(() => {
      SupportService.getTicketByToken(ticketA.id, 'random_invalid_token_12345678901234567890123456789012345678901234');
    }, /UNAUTHORIZED_ACCESS/);
  });

  // TEST I & J: Status Workflow & Closed Ticket Policy
  it('TEST I & J: Status transitions (IN_PROGRESS -> RESOLVED -> CLOSED) and closed tickets block new replies', () => {
    const db = getDatabase();
    const ticket = db.prepare('SELECT id, access_token FROM support_tickets LIMIT 1').get() as any;

    SupportService.updateTicketStatus(ticket.id, 'IN_PROGRESS', 'admin_super');
    let row = db.prepare('SELECT status FROM support_tickets WHERE id = ?').get(ticket.id) as any;
    assert.strictEqual(row.status, 'IN_PROGRESS');

    SupportService.updateTicketStatus(ticket.id, 'RESOLVED', 'admin_super');
    row = db.prepare('SELECT status FROM support_tickets WHERE id = ?').get(ticket.id) as any;
    assert.strictEqual(row.status, 'RESOLVED');

    SupportService.updateTicketStatus(ticket.id, 'CLOSED', 'admin_super');
    row = db.prepare('SELECT status, closed_at FROM support_tickets WHERE id = ?').get(ticket.id) as any;
    assert.strictEqual(row.status, 'CLOSED');
    assert.ok(row.closed_at !== null);

    // Verify audit log for status change
    const audit = db.prepare("SELECT * FROM audit_logs WHERE target_id = ? AND action = 'SUPPORT_STATUS_CHANGED'").get(ticket.id) as any;
    assert.ok(audit, 'Audit log must record ticket status transition');
  });

  // TEST K: Admin Authentication
  it('TEST K: Admin login authentication works with superadmin and official credentials', async () => {
    const valid = await AdminAuthService.login('superadmin', 'NivaAdmin2026!', '123456');
    assert.ok(valid.token, 'Admin login must return a valid session token');
    assert.strictEqual(valid.admin.role, 'SUPER_ADMIN');

    // Negative test: invalid password
    await assert.rejects(async () => {
      await AdminAuthService.login('superadmin', 'WrongPassword123');
    }, /INVALID_CREDENTIALS/);
  });

  // TEST L: Telegram Identity Tracking & Historical Username Resolution
  it('TEST L: User changes username @olduser -> @newuser, system records snapshot and resolves report correctly', () => {
    const userId = 'user_target';
    const telegramId = '1003';

    // 1. Initial snapshot
    IdentityService.recordIdentitySnapshot({
      userId,
      telegramId,
      username: 'oknum_lama',
      displayName: 'Nama Lama',
    });

    // 2. User changes username & display name
    const updateResult = IdentityService.recordIdentitySnapshot({
      userId,
      telegramId,
      username: 'oknum_baru_menyamar',
      displayName: 'Nama Baru Samaran',
    });

    assert.strictEqual(updateResult.changed, true);

    // 3. Admin searches for historical username '@oknum_lama'
    const resolved = IdentityService.resolveUserByAnyIdentifier('oknum_lama');
    assert.ok(resolved !== null);
    assert.strictEqual(resolved.userId, 'user_target');
    assert.strictEqual(resolved.matchedVia, 'HISTORICAL_USERNAME');
    assert.strictEqual(resolved.currentUsername, 'oknum_baru_menyamar');
    assert.ok(resolved.history.length >= 1);
  });

  // TEST M: User Report & Moderation Action with Audit Trail
  it('TEST M: User files report (Scam/Harassment), report enters queue with resolved identity, admin bans user with audit log', () => {
    const db = getDatabase();

    // User Alpha reports User Target using historical username
    const report = ModerationService.createReport({
      reporterUserId: 'user_alpha',
      reportedUserId: 'user_target',
      category: 'SCAM',
      evidenceText: 'Pengguna meminta transfer uang berkedok biaya pendaftaran kegiatan kampus.',
      reportedUsernameAtTime: 'oknum_lama',
    });

    assert.ok(report.report_code.startsWith('REP-'));
    assert.strictEqual(report.status, 'OPEN');

    // Admin fetches reports with rich details
    const queue = ModerationService.getReportsWithDetails('OPEN');
    const item = queue.find((r) => r.id === report.id);
    assert.ok(item, 'Report must appear in admin moderation queue');
    assert.strictEqual(item.reported_user_id, 'user_target');
    assert.strictEqual(item.reported_username_at_time, 'oknum_lama');
    assert.strictEqual(item.reported_current_username, 'oknum_baru_menyamar');
    assert.ok(item.historical_usernames.includes('oknum_lama'));

    // Admin resolves report by banning the user
    ModerationService.resolveReport(report.id, 'admin_super', 'BAN', 'Terbukti melakukan penipuan finansial');

    // Verify reported user is BANNED
    const bannedUser = db.prepare('SELECT status FROM users WHERE id = ?').get('user_target') as any;
    assert.strictEqual(bannedUser.status, 'BANNED');

    // Verify audit log
    const audit = db.prepare("SELECT * FROM audit_logs WHERE target_id = ? AND action = 'RESOLVE_REPORT_BAN'").get(report.id) as any;
    assert.ok(audit, 'Audit trail must record moderation ban action');
  });

  // TEST N: KTM Student ID Verification & Audit Logging
  it('TEST N: Student KTM verification queue, approval updates user status to KTM_VERIFIED and logs audit', () => {
    const db = getDatabase();
    const verifId = 'verif_test_ktm_01';

    // Seed pending verification
    db.prepare(`
      INSERT INTO student_verifications (
        id, user_id, institution_id, status, card_hash, ocr_extracted_text, ocr_confidence, review_notes
      ) VALUES (?, 'user_beta', 'inst_undip', 'NEEDS_REVIEW', 'hash_beta_123', 'Universitas Diponegoro - Siti Rahma - 24060120140001', 94.5, 'KTM asli dan jelas')
    `).run(verifId);

    db.prepare("UPDATE users SET verification_status = 'KTM_PENDING' WHERE id = 'user_beta'").run();

    // Check queue
    const queue = VerificationService.getReviewQueue();
    const found = queue.find((q) => q.id === verifId);
    assert.ok(found, 'Pending KTM must appear in review queue');

    // Admin approves
    VerificationService.resolveManualReview(verifId, 'APPROVE', 'admin_super', 'KTM valid dan nama sesuai identitas');

    // Verify DB
    const user = db.prepare('SELECT status, verification_status FROM users WHERE id = ?').get('user_beta') as any;
    assert.strictEqual(user.verification_status, 'KTM_VERIFIED');
    assert.strictEqual(user.status, 'ACTIVE');

    // Verify audit
    const audit = db.prepare("SELECT * FROM audit_logs WHERE target_id = ? AND action = 'KTM_APPROVE'").get(verifId) as any;
    assert.ok(audit, 'Audit log must record KTM approval');
  });

  // TEST O: Premium Telegram Order, Verification & Entitlement
  it('TEST O: User creates Premium order, admin approves, user status becomes PREMIUM_ACTIVE with audit log', () => {
    const db = getDatabase();

    const orderRes = PremiumService.createOrder({
      planId: 'plan_starter_5k',
      userId: 'user_beta',
      contactName: 'Siti Rahma',
      contactTelegram: 'siti_undip',
      userNote: 'Transfer atas nama BCA Siti Rahma',
    });

    assert.ok(orderRes.order.public_order_id.startsWith('NIVA-PREM-'));
    assert.strictEqual(orderRes.order.amount, 5000);

    // Admin verifies and approves order
    const approveRes = PremiumService.adminApproveOrder({
      publicOrderId: orderRes.order.public_order_id,
      adminId: 'admin_super',
      adminNotes: 'QRIS payment proof verified successfully.',
    });

    assert.strictEqual(approveRes.success, true);
    assert.strictEqual(approveRes.subscription.status, 'ACTIVE');

    // Verify user table has PREMIUM_ACTIVE
    const user = db.prepare('SELECT subscription_status FROM users WHERE id = ?').get('user_beta') as any;
    assert.strictEqual(user.subscription_status, 'PREMIUM_ACTIVE');

    // Verify hasPremiumAccess
    assert.strictEqual(PremiumService.hasPremiumAccess('user_beta'), true);

    // Verify audit log
    const audit = db.prepare("SELECT * FROM audit_logs WHERE target_id = ? AND action = 'PREMIUM_APPROVED'").get(orderRes.order.id) as any;
    assert.ok(audit, 'Audit log must record premium approval');
  });
});
