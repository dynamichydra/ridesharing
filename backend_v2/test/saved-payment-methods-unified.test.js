import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractRazorpaySavedCard } from '../src/modules/payment/gateways/razorpay.gateway.js';
import { annotateSavedMethodsForProfile } from '../src/modules/payment/payment-region.service.js';
import { isSavedMethodId, toActionRequiredResponse } from '../src/modules/payment-method/saved-method-charge.service.js';
import { computeDuesMinor } from '../src/modules/wallet/wallet.service.js';

// Pure-logic coverage for saved payment methods shared by the rider + driver apps — no DB or
// live gateway needed.

test('Razorpay: token card details become the stored method (not client-supplied values)', () => {
  const saved = extractRazorpaySavedCard({
    customerId: 'cust_123',
    payment: { id: 'pay_1', token_id: 'token_abc', method: 'card' },
    token: {
      id: 'token_abc',
      method: 'card',
      card: { last4: '5449', network: 'MasterCard', type: 'debit', issuer: 'HDFC', expiry_month: 3, expiry_year: 2029, international: false },
    },
  });
  assert.equal(saved.gatewayCustomerId, 'cust_123');
  assert.equal(saved.paymentMethodToken, 'token_abc');
  assert.equal(saved.last4, '5449');
  assert.equal(saved.cardBrand, 'MasterCard');
  assert.equal(saved.expiryMonth, '03');
  assert.equal(saved.expiryYear, '2029');
  assert.equal(saved.cardType, 'debit');
  assert.equal(saved.billingCountry, 'IN');
  assert.equal(saved.metadata.issuer, 'HDFC');
});

test('Razorpay: falls back to payment.card / token_id when the token entity is sparse', () => {
  const saved = extractRazorpaySavedCard({
    customerId: 'cust_9',
    payment: { token_id: 'token_x', card: { last4: '1111', network: 'American_Express' } },
    token: {},
  });
  assert.equal(saved.paymentMethodToken, 'token_x');
  assert.equal(saved.last4, '1111');
  assert.equal(saved.cardBrand, 'American Express');
  assert.equal(saved.expiryMonth, null);
});

test('profile annotation flags only expired cards', () => {
  const [expired, valid, noExpiry] = annotateSavedMethodsForProfile([
    { id: 'a', expiryMonth: '01', expiryYear: '2001', isDefault: true },
    { id: 'b', expiryMonth: '12', expiryYear: '2099' },
    { id: 'c' },
  ]);
  assert.equal(expired.isEligible, false);
  assert.equal(expired.ineligibilityCode, 'EXPIRED');
  assert.equal(expired.isPreferred, true);
  assert.equal(valid.isEligible, true);
  assert.equal(noExpiry.isEligible, true);
});

test('cash/wallet pseudo-ids are never treated as saved methods', () => {
  for (const id of ['cash', 'wallet', 'WALLET', 'online', null, undefined, '']) {
    assert.equal(isSavedMethodId(id), false, `expected ${id} to be non-card`);
  }
  assert.equal(isSavedMethodId('7d3c2c9e-2a59-4a0c-9c3e-1d2f0b1c9a11'), true);
});

test('action-required response has no `status` key (driver app reads status as "already active")', () => {
  const res = toActionRequiredResponse({
    method: { id: 'pm-row-1', gatewayCustomerId: 'cus_1' },
    gateway: { name: 'stripe' },
    charge: { status: 'requires_action', gatewayOrderId: 'pi_1', clientSecret: 'pi_1_secret', publishableKey: 'pk', amount: 10, currency: 'CAD' },
  }, { paymentAttemptId: 'att-1' });
  assert.equal('status' in res, false);
  assert.equal(res.requiresAction, true);
  assert.equal(res.gateway, 'stripe');
  assert.equal(res.gatewayOrderId, 'pi_1');
  assert.equal(res.clientSecret, 'pi_1_secret');
  assert.equal(res.gatewayCustomerId, 'cus_1');
  assert.equal(res.paymentMethodId, 'pm-row-1');
  assert.equal(res.paymentAttemptId, 'att-1');
});

test('driver dues are the negative part of the wallet balance', () => {
  assert.equal(computeDuesMinor(-25050), 25050);
  assert.equal(computeDuesMinor(0), 0);
  assert.equal(computeDuesMinor(1200), 0);
});

test('wallet top-up coupon bonus: percentage with cap, flat never exceeds the top-up', async () => {
  const { computePromoAmountMinor } = await import('../src/modules/promo/promo.service.js');
  assert.equal(computePromoAmountMinor({ discountType: 'percentage', discountValue: 10 }, 50000), 5000);
  assert.equal(computePromoAmountMinor({ discountType: 'percentage', discountValue: 10, maxDiscountMinor: 2000 }, 50000), 2000);
  assert.equal(computePromoAmountMinor({ discountType: 'flat_amount', discountValue: 10000 }, 50000), 10000);
  assert.equal(computePromoAmountMinor({ discountType: 'flat_amount', discountValue: 10000 }, 5000), 5000);
});
