import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectEligiblePayout } from '../src/modules/payout/payout.service.js';

// selectEligiblePayout() is the gate runPayoutBatch()/initiateInstantPayout() check before
// ever touching the DB transaction or calling a gateway.

const approvedStripeAccount = { gateway: 'stripe', status: 'approved' };

test('eligible: positive balance, approved account, payout-capable gateway', () => {
  const result = selectEligiblePayout({ balanceMinor: 5000 }, approvedStripeAccount, true);
  assert.equal(result.eligible, true);
});

test('ineligible: zero balance', () => {
  const result = selectEligiblePayout({ balanceMinor: 0 }, approvedStripeAccount, true);
  assert.equal(result.eligible, false);
  assert.match(result.reason, /balance/);
});

test('ineligible: negative balance', () => {
  const result = selectEligiblePayout({ balanceMinor: -100 }, approvedStripeAccount, true);
  assert.equal(result.eligible, false);
});

test('ineligible: no wallet at all', () => {
  const result = selectEligiblePayout(null, approvedStripeAccount, true);
  assert.equal(result.eligible, false);
});

test('ineligible: no payout account on file', () => {
  const result = selectEligiblePayout({ balanceMinor: 5000 }, null, true);
  assert.equal(result.eligible, false);
  assert.match(result.reason, /not approved/);
});

test('ineligible: payout account still pending admin review', () => {
  const result = selectEligiblePayout({ balanceMinor: 5000 }, { gateway: 'stripe', status: 'pending' }, true);
  assert.equal(result.eligible, false);
});

test('ineligible: payout account rejected', () => {
  const result = selectEligiblePayout({ balanceMinor: 5000 }, { gateway: 'stripe', status: 'rejected' }, true);
  assert.equal(result.eligible, false);
});

test('ineligible: gateway does not support payouts (razorpay today), even with balance and approval', () => {
  const result = selectEligiblePayout({ balanceMinor: 5000 }, { gateway: 'razorpay', status: 'approved' }, false);
  assert.equal(result.eligible, false);
  assert.match(result.reason, /razorpay/);
});
