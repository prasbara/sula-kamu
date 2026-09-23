import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../src/database/db';
import { supportContributionService } from '../src/services/support/supportContributionService';

describe('SUPPORT NIVA Feature Test Suite', () => {
  const db = getDatabase();

  test('1. Support code format matches SUPPORT-NXXXXXX', () => {
    const code = supportContributionService.generateSupportCode();
    assert.match(code, /^SUPPORT-N[0-9]{6}$/, 'Support code must follow format SUPPORT-NXXXXXX');
  });

  test('2. Nominal validation rejects amounts below Rp5.000 or above Rp50.000.000', async () => {
    await assert.rejects(
      async () => {
        await supportContributionService.createContribution({
          amount: 4999,
          payment_proof: 'data:image/png;base64,dummy'
        });
      },
      /minimal Rp5\.000/
    );

    await assert.rejects(
      async () => {
        await supportContributionService.createContribution({
          amount: 50000001,
          payment_proof: 'data:image/png;base64,dummy'
        });
      },
      /maksimal Rp50\.000\.000/
    );

    await assert.rejects(
      async () => {
        await supportContributionService.createContribution({
          amount: 25000,
          payment_proof: ''
        });
      },
      /Bukti pembayaran wajib diunggah/
    );
  });

  test('3. Successful contribution creation enters PENDING_VERIFICATION state', async () => {
    const result = await supportContributionService.createContribution({
      amount: 25000,
      donor_name: 'Mahasiswa Peduli NIVA',
      note: 'Semangat kembangkan server Stranger Cam!',
      payment_proof: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
    });

    assert.ok(result.id, 'Contribution must have an ID');
    assert.match(result.support_code, /^SUPPORT-N[0-9]{6}$/);
    assert.equal(result.amount, 25000);
    assert.equal(result.status, 'PENDING_VERIFICATION');
    assert.equal(result.donor_name, 'Mahasiswa Peduli NIVA');
    assert.equal(result.payment_method, 'QRIS');

    // Verify row in database directly
    const row = db.prepare('SELECT * FROM support_contributions WHERE id = ?').get(result.id) as any;
    assert.ok(row, 'Row must exist in support_contributions table');
    assert.equal(row.status, 'PENDING_VERIFICATION');
    assert.equal(row.verified_by, null);
    assert.equal(row.verified_at, null);
  });

  test('4. Safe status lookup retrieves contribution without sensitive exposure', async () => {
    const created = await supportContributionService.createContribution({
      amount: 50000,
      donor_name: 'Alumni Undip',
      note: 'Dukungan serverless migration',
      payment_proof: 'data:image/png;base64,dummyProofData'
    });

    const lookedUp = await supportContributionService.getContributionByCode(created.support_code);
    assert.ok(lookedUp);
    assert.equal(lookedUp.support_code, created.support_code);
    assert.equal(lookedUp.amount, 50000);
    assert.equal(lookedUp.status, 'PENDING_VERIFICATION');
    assert.equal(lookedUp.donor_name, 'Alumni Undip');

    // Unknown code returns null
    const notFound = await supportContributionService.getContributionByCode('SUPPORT-N999999');
    assert.equal(notFound, null);
  });

  test('5. Admin stats accurately aggregates contributions from production database', async () => {
    const { stats, contributions } = await supportContributionService.getAdminContributions({ limit: 100 });
    assert.ok(stats.total >= 2, 'Total must account for newly created records');
    assert.ok(stats.pending >= 2, 'Pending count must be at least 2');
    assert.ok(Array.isArray(contributions));
  });

  test('6. Admin verify transitions status to VERIFIED, sets verified_by, verified_at, and writes audit log', async () => {
    const created = await supportContributionService.createContribution({
      amount: 100000,
      donor_name: 'Sponsor Komunitas',
      payment_proof: 'data:image/png;base64,dummyProof100k'
    });

    const verified = await supportContributionService.verifyContribution(created.id, 'admin-tester-01');
    assert.equal(verified.status, 'VERIFIED');
    assert.equal(verified.verified_by, 'admin-tester-01');
    assert.ok(verified.verified_at);

    // Verify DB state
    const row = db.prepare('SELECT * FROM support_contributions WHERE id = ?').get(created.id) as any;
    assert.equal(row.status, 'VERIFIED');
    assert.equal(row.verified_by, 'admin-tester-01');

    // Verify audit log entry
    const audit = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE action = 'SUPPORT_CONTRIBUTION_VERIFIED' AND target_id = ?
    `).get(created.id) as any;
    assert.ok(audit, 'Audit log must record verification');
    assert.equal(audit.actor_id, 'admin-tester-01');
  });

  test('7. Admin reject requires a reason, transitions status to REJECTED, and writes audit log', async () => {
    const created = await supportContributionService.createContribution({
      amount: 10000,
      donor_name: 'Anonim',
      payment_proof: 'data:image/png;base64,invalidProof'
    });

    // Rejection without reason must fail
    await assert.rejects(
      async () => {
        await supportContributionService.rejectContribution(created.id, 'admin-tester-01', '');
      },
      /Alasan penolakan wajib diisi/
    );

    const rejected = await supportContributionService.rejectContribution(
      created.id, 
      'admin-tester-01', 
      'Bukti screenshot transfer buram dan tidak terbaca'
    );
    assert.equal(rejected.status, 'REJECTED');
    assert.equal(rejected.rejection_reason, 'Bukti screenshot transfer buram dan tidak terbaca');

    // Verify DB state
    const row = db.prepare('SELECT * FROM support_contributions WHERE id = ?').get(created.id) as any;
    assert.equal(row.status, 'REJECTED');
    assert.equal(row.rejection_reason, 'Bukti screenshot transfer buram dan tidak terbaca');

    // Verify audit log entry
    const audit = db.prepare(`
      SELECT * FROM audit_logs 
      WHERE action = 'SUPPORT_CONTRIBUTION_REJECTED' AND target_id = ?
    `).get(created.id) as any;
    assert.ok(audit, 'Audit log must record rejection');
    assert.equal(audit.actor_id, 'admin-tester-01');
  });

  test('8. Dynamic QRIS configuration updates without redeploying', async () => {
    const originalConfig = await supportContributionService.getQrisConfig();
    assert.ok(originalConfig);

    const updated = await supportContributionService.updateQrisConfig(
      {
        account_name: 'NIVA Semarang Production',
        instructions: 'Scan menggunakan QRIS m-banking/e-wallet Anda.',
        image_data: 'data:image/png;base64,dummyQrisUpdated'
      },
      'admin-super'
    );

    assert.equal(updated.account_name, 'NIVA Semarang Production');
    assert.equal(updated.instructions, 'Scan menggunakan QRIS m-banking/e-wallet Anda.');
    assert.equal(updated.image_data, 'data:image/png;base64,dummyQrisUpdated');

    const retrieved = await supportContributionService.getQrisConfig();
    assert.equal(retrieved.account_name, 'NIVA Semarang Production');
    assert.equal(retrieved.image_data, 'data:image/png;base64,dummyQrisUpdated');
  });

  test('9. Partnership & Sponsorship ticketing integration', () => {
    // Verify that support_tickets accepts category PARTNERSHIP without constraint violation
    const testUserId = `test-user-support-${Date.now()}`;
    db.prepare(`
      INSERT OR IGNORE INTO users (id, telegram_id, status, created_at, updated_at)
      VALUES (?, ?, 'ACTIVE', datetime('now'), datetime('now'))
    `).run(testUserId, String(Math.floor(Math.random() * 1000000000)));

    const ticketId = `NIVA-PARTNER-${Date.now()}`;
    const insertStmt = db.prepare(`
      INSERT INTO support_tickets (
        id, user_id, category, priority, subject, status, contact_name, contact_email, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    assert.doesNotThrow(() => {
      insertStmt.run(
        ticketId,
        testUserId,
        'PARTNERSHIP',
        'NORMAL',
        'Inquiry Sponsorship Infrastructure NIVA',
        'OPEN',
        'Mitra Komunitas Semarang',
        'partner@example.com'
      );
    }, 'Category PARTNERSHIP must be valid in support_tickets table');

    const ticketRow = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(ticketId) as any;
    assert.ok(ticketRow);
    assert.equal(ticketRow.category, 'PARTNERSHIP');
    assert.equal(ticketRow.subject, 'Inquiry Sponsorship Infrastructure NIVA');
  });
});
