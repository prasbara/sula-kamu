import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { PremiumService } from '../src/services/premium/premiumService';
import { getDatabase } from '../src/database/db';

describe('NIVA Premium & QRIS Verification Suite', () => {
  const db = getDatabase();

  test('fetches available plans and ensures Rp5.000 and Rp8.000 integer prices', () => {
    const plans = PremiumService.getPlans();
    assert.ok(plans.length >= 2, 'Should have at least 2 plans');

    const plan5k = plans.find(p => p.price === 5000);
    const plan8k = plans.find(p => p.price === 8000);

    assert.ok(plan5k, 'Plan with price 5000 must exist');
    assert.ok(plan8k, 'Plan with price 8000 must exist');
    assert.equal(PremiumService.formatRupiah(plan5k.price), 'Rp5.000');
    assert.equal(PremiumService.formatRupiah(plan8k.price), 'Rp8.000');
  });

  test('free user initially has no premium entitlement', () => {
    const testUserId = `usr_test_free_${Date.now()}`;
    const hasPremium = PremiumService.hasPremiumAccess(testUserId);
    assert.equal(hasPremium, false, 'Free user must not have premium access');

    const entitlement = PremiumService.getUserEntitlement(testUserId);
    assert.equal(entitlement.isPremium, false);
    assert.equal(entitlement.status, 'FREE');
  });

  test('creates premium order with non-enumerable ID and links to Support Ticket', () => {
    const plans = PremiumService.getPlans();
    const plan = plans[0];
    const testUserId = `usr_ord_${Date.now()}`;

    const result = PremiumService.createOrder({
      planId: plan.id,
      userId: testUserId,
      contactName: 'Budi Semarang',
      contactEmail: 'budi@semarang.id',
      userNote: 'Transfer via BCA QRIS',
    });

    assert.ok(result.order.public_order_id.startsWith('NIVA-PREM-'));
    assert.equal(result.order.status, 'PENDING');
    assert.equal(result.order.amount, plan.price);
    assert.ok(result.ticketId.startsWith('NIVA-'));
    assert.ok(result.ticketAccessToken.length >= 64);

    // Order must be retrievable
    const orderDetails = PremiumService.getOrderByPublicId(result.order.public_order_id);
    assert.ok(orderDetails);
    assert.equal(orderDetails.order.public_order_id, result.order.public_order_id);
  });

  test('user confirms payment -> status updates to UNDER_REVIEW', async () => {
    const plans = PremiumService.getPlans();
    const plan = plans[0];
    const testUserId = `usr_confirm_${Date.now()}`;

    const orderRes = PremiumService.createOrder({
      planId: plan.id,
      userId: testUserId,
      contactName: 'Citra Tembalang',
    });

    const confirmRes = await PremiumService.confirmPayment({
      publicOrderId: orderRes.order.public_order_id,
      userNote: 'Sudah bayar via Dana pukul 14:00',
      ticketId: orderRes.ticketId,
      ticketAccessToken: orderRes.ticketAccessToken,
    });

    assert.equal(confirmRes.success, true);
    assert.equal(confirmRes.status, 'UNDER_REVIEW');

    const updated = PremiumService.getOrderByPublicId(orderRes.order.public_order_id);
    assert.equal(updated?.order.status, 'UNDER_REVIEW');
  });

  test('admin approves order -> activates premium subscription server-side', () => {
    const plans = PremiumService.getPlans();
    const plan = plans[0];
    const testUserId = `usr_approve_${Date.now()}`;

    const orderRes = PremiumService.createOrder({
      planId: plan.id,
      userId: testUserId,
      contactName: 'Dewi Pleburan',
    });

    // Free before approval
    assert.equal(PremiumService.hasPremiumAccess(testUserId), false);

    // Admin approves
    const approveRes = PremiumService.adminApproveOrder({
      publicOrderId: orderRes.order.public_order_id,
      adminId: 'admin-super-01',
      adminNotes: 'Bukti transfer valid dan dana masuk.',
    });

    assert.equal(approveRes.success, true);
    assert.equal(approveRes.subscription.status, 'ACTIVE');

    // User now has active entitlement server-side
    assert.equal(PremiumService.hasPremiumAccess(testUserId), true);
    const entitlement = PremiumService.getUserEntitlement(testUserId);
    assert.equal(entitlement.isPremium, true);
    assert.equal(entitlement.status, 'ACTIVE');
    assert.ok(entitlement.daysRemaining! > 0);
  });

  test('admin rejection requires reason and does not grant entitlement', () => {
    const plans = PremiumService.getPlans();
    const plan = plans[0];
    const testUserId = `usr_reject_${Date.now()}`;

    const orderRes = PremiumService.createOrder({
      planId: plan.id,
      userId: testUserId,
      contactName: 'Eko Pedurungan',
    });

    // Rejection without reason must fail
    assert.throws(() => {
      PremiumService.adminRejectOrder({
        publicOrderId: orderRes.order.public_order_id,
        adminId: 'admin-pay-01',
        rejectionReason: '',
      });
    }, /Alasan penolakan/);

    // Rejection with reason succeeds
    const rejectRes = PremiumService.adminRejectOrder({
      publicOrderId: orderRes.order.public_order_id,
      adminId: 'admin-pay-01',
      rejectionReason: 'Nominal pada bukti transfer tidak sesuai.',
    });

    assert.equal(rejectRes.success, true);
    const orderDetails = PremiumService.getOrderByPublicId(orderRes.order.public_order_id);
    assert.equal(orderDetails?.order.status, 'REJECTED');
    assert.equal(orderDetails?.payment.rejection_reason, 'Nominal pada bukti transfer tidak sesuai.');
    assert.equal(PremiumService.hasPremiumAccess(testUserId), false);
  });
});
