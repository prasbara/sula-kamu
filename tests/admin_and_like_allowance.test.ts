import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../src/database/db';
import { AdminAuthService } from '../src/services/auth/adminAuthService';
import { MatchingService } from '../src/services/matchmaking/matchingService';
import { PremiumService } from '../src/services/premium/premiumService';

test('NIVA Admin Credentials & Dynamic Like Limits Suite', async (t) => {
  const db = getDatabase();

  await t.test('1. Superadmin 1 authentication with official password and recovery password', async () => {
    // Primary password
    const res1 = await AdminAuthService.login('superadmin.1', 'Secmonda111', '123456');
    assert.equal(res1.admin.username, 'superadmin.1');
    assert.equal(res1.admin.role, 'SUPER_ADMIN');

    // Recovery password
    const res1Rec = await AdminAuthService.login('superadmin.1', 'SulaAdmin2026!', '123456');
    assert.equal(res1Rec.admin.username, 'superadmin.1');
    assert.equal(res1Rec.admin.role, 'SUPER_ADMIN');
  });

  await t.test('2. Superadmin 22 authentication with official password and recovery password', async () => {
    // Primary password
    const res2 = await AdminAuthService.login('superadmin.22', 'anjaystartupwkwkwk0', '123456');
    assert.equal(res2.admin.username, 'superadmin.22');
    assert.equal(res2.admin.role, 'SUPER_ADMIN');

    // Recovery password
    const res2Rec = await AdminAuthService.login('superadmin.22', 'SulaAdmin2026!', '123456');
    assert.equal(res2Rec.admin.username, 'superadmin.22');
    assert.equal(res2Rec.admin.role, 'SUPER_ADMIN');
  });

  await t.test('3. Superadmin 33 authentication with official password and recovery password', async () => {
    // Primary password
    const res3 = await AdminAuthService.login('superadmin.33', 'OTWB2BSAASBOSKU', '123456');
    assert.equal(res3.admin.username, 'superadmin.33');
    assert.equal(res3.admin.role, 'SUPER_ADMIN');

    // Recovery password
    const res3Rec = await AdminAuthService.login('superadmin.33', 'SulaAdmin2026!', '123456');
    assert.equal(res3Rec.admin.username, 'superadmin.33');
    assert.equal(res3Rec.admin.role, 'SUPER_ADMIN');
  });

  await t.test('4. Daily Like Allowance Rules (Photo 10, Photo+KTM 30, Premium 50)', () => {
    const uPhoto = 'test_usr_photo_10';
    const uKtm = 'test_usr_ktm_30';
    const uPrem = 'test_usr_prem_50';

    db.prepare(`
      INSERT OR REPLACE INTO users (id, telegram_id, status, verification_status, subscription_status, is_18_plus)
      VALUES (?, ?, 'ACTIVE', 'PHOTO_VERIFIED', 'FREE', 1)
    `).run(uPhoto, uPhoto);

    db.prepare(`
      INSERT OR REPLACE INTO users (id, telegram_id, status, verification_status, subscription_status, is_18_plus)
      VALUES (?, ?, 'ACTIVE', 'KTM_VERIFIED', 'FREE', 1)
    `).run(uKtm, uKtm);

    db.prepare(`
      INSERT OR REPLACE INTO users (id, telegram_id, status, verification_status, subscription_status, is_18_plus)
      VALUES (?, ?, 'ACTIVE', 'PHOTO_VERIFIED', 'PREMIUM_ACTIVE', 1)
    `).run(uPrem, uPrem);

    const aPhoto = MatchingService.getUserDailyLikeAllowance(uPhoto);
    const aKtm = MatchingService.getUserDailyLikeAllowance(uKtm);
    const aPrem = MatchingService.getUserDailyLikeAllowance(uPrem);

    assert.equal(aPhoto, 10, 'Photo-only verification must yield exactly 10 likes/day');
    assert.equal(aKtm, 30, 'Photo + Student KTM verification must yield exactly 30 likes/day');
    assert.equal(aPrem, 50, 'NIVA Premium subscription must yield exactly 50 likes/day');

    // Cleanup
    db.prepare('DELETE FROM users WHERE id IN (?, ?, ?)').run(uPhoto, uKtm, uPrem);
  });

  await t.test('5. Premium plans reflect 5.000 (7 Hari) and 8.000 (30 Hari) with 50 likes info', () => {
    const plans = PremiumService.getPlans();
    assert.equal(plans.length, 2);

    const plan1 = plans.find((p) => p.price === 5000);
    const plan2 = plans.find((p) => p.price === 8000);

    assert.ok(plan1, 'Paket NIVA 1 (Rp5.000) must exist');
    assert.equal(plan1.duration_days, 7);
    assert.ok(plan1.features.includes('50 like'), 'Paket 1 features must state 50 likes');

    assert.ok(plan2, 'Paket NIVA 2 (Rp8.000) must exist');
    assert.equal(plan2.duration_days, 30);
    assert.ok(plan2.features.includes('50 like'), 'Paket 2 features must state 50 likes');
  });
});
