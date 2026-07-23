import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateRefundAmount } from '../src/modules/refund/refund.service.js';

// validateRefundAmount() guards initiateRefund() before anything is written — a payment can
// be refunded across several partial installments as long as the cumulative total never
// exceeds what was originally charged.

const capturedPayment = { status: 'captured', amountMinor: 10000 };

test('accepts a full refund of a captured payment with nothing refunded yet', () => {
  const result = validateRefundAmount(capturedPayment, 0, 10000);
  assert.equal(result.valid, true);
});

test('accepts a partial refund within the remaining balance', () => {
  const result = validateRefundAmount(capturedPayment, 0, 4000);
  assert.equal(result.valid, true);
});

test('accepts a second partial refund that exactly exhausts the remaining balance', () => {
  const result = validateRefundAmount(capturedPayment, 4000, 6000);
  assert.equal(result.valid, true);
});

test('rejects a refund exceeding the remaining balance', () => {
  const result = validateRefundAmount(capturedPayment, 4000, 7000);
  assert.equal(result.valid, false);
  assert.match(result.message, /exceeds remaining/);
});

test('rejects any refund once the payment is already fully refunded', () => {
  const result = validateRefundAmount(capturedPayment, 10000, 1);
  assert.equal(result.valid, false);
  assert.match(result.message, /already been fully refunded/);
});

test('rejects refunding a payment that was never captured', () => {
  const result = validateRefundAmount({ status: 'created', amountMinor: 10000 }, 0, 5000);
  assert.equal(result.valid, false);
  assert.match(result.message, /status 'created'/);
});

test('rejects a zero or negative amount', () => {
  assert.equal(validateRefundAmount(capturedPayment, 0, 0).valid, false);
  assert.equal(validateRefundAmount(capturedPayment, 0, -100).valid, false);
});

test('rejects a non-integer amount', () => {
  assert.equal(validateRefundAmount(capturedPayment, 0, 50.5).valid, false);
});
