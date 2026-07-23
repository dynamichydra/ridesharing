import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diffTransactions } from '../src/modules/reconciliation/reconciliation.service.js';

// diffTransactions() is the core comparison reconciliation.job.js runs daily — given our
// internal `payments` rows and the processor's own transaction list for the same window, it
// reports (never corrects) four kinds of drift.

test('no findings when both sides match exactly', () => {
  const internal = [{ gatewayPaymentId: 'pay_1', amountMinor: 5000, id: 'p1' }];
  const external = [{ gatewayPaymentId: 'pay_1', amountMinor: 5000 }];
  assert.deepEqual(diffTransactions(internal, external), []);
});

test('flags a transaction the processor has that we do not (missing_internal)', () => {
  const result = diffTransactions([], [{ gatewayPaymentId: 'pay_1', amountMinor: 5000 }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'missing_internal');
  assert.equal(result[0].externalAmountMinor, 5000);
  assert.equal(result[0].internalAmountMinor, null);
});

test('flags a transaction we have that the processor does not (missing_external)', () => {
  const internal = [{ gatewayPaymentId: 'pay_1', amountMinor: 5000, id: 'p1' }];
  const result = diffTransactions(internal, []);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'missing_external');
  assert.equal(result[0].internalAmountMinor, 5000);
  assert.equal(result[0].paymentId, 'p1');
});

test('flags an amount mismatch when both sides have the transaction but differ', () => {
  const internal = [{ gatewayPaymentId: 'pay_1', amountMinor: 5000, id: 'p1' }];
  const external = [{ gatewayPaymentId: 'pay_1', amountMinor: 4900 }];
  const result = diffTransactions(internal, external);
  assert.equal(result.length, 1);
  assert.equal(result[0].type, 'amount_mismatch');
  assert.equal(result[0].internalAmountMinor, 5000);
  assert.equal(result[0].externalAmountMinor, 4900);
});

test('flags a duplicate gatewayPaymentId on our own side', () => {
  const internal = [
    { gatewayPaymentId: 'pay_1', amountMinor: 5000, id: 'p1' },
    { gatewayPaymentId: 'pay_1', amountMinor: 5000, id: 'p2' },
  ];
  const result = diffTransactions(internal, [{ gatewayPaymentId: 'pay_1', amountMinor: 5000 }]);
  assert.equal(result.filter((m) => m.type === 'duplicate_internal').length, 1);
});

test('paymentId is null when no internal row is available to attribute a finding to', () => {
  const result = diffTransactions([], [{ gatewayPaymentId: 'pay_1', amountMinor: 5000 }]);
  assert.equal(result[0].paymentId, null);
});

test('multiple independent transactions each get judged on their own merits', () => {
  const internal = [
    { gatewayPaymentId: 'pay_1', amountMinor: 5000, id: 'p1' },
    { gatewayPaymentId: 'pay_2', amountMinor: 3000, id: 'p2' },
  ];
  const external = [
    { gatewayPaymentId: 'pay_1', amountMinor: 5000 },
    { gatewayPaymentId: 'pay_3', amountMinor: 1000 },
  ];
  const result = diffTransactions(internal, external);
  const types = result.map((m) => m.type).sort();
  assert.deepEqual(types, ['missing_external', 'missing_internal']);
});
