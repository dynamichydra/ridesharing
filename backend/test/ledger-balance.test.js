import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBalancedEntries } from '../src/modules/ledger/ledger.service.js';

// validateBalancedEntries() is the invariant postTransaction() enforces before writing
// anything — every entries array must debit and credit the same amount per currency.

test('accepts a simple two-entry transaction that balances', () => {
  const result = validateBalancedEntries([
    { accountId: 'a', direction: 'debit', amountMinor: 500, currencyCode: 'INR' },
    { accountId: 'b', direction: 'credit', amountMinor: 500, currencyCode: 'INR' },
  ]);
  assert.equal(result.balanced, true);
});

test('rejects a transaction where debits and credits differ', () => {
  const result = validateBalancedEntries([
    { accountId: 'a', direction: 'debit', amountMinor: 500, currencyCode: 'INR' },
    { accountId: 'b', direction: 'credit', amountMinor: 400, currencyCode: 'INR' },
  ]);
  assert.equal(result.balanced, false);
  assert.match(result.message, /INR/);
});

test('balances independently per currency — mixed currencies must each net to zero', () => {
  const result = validateBalancedEntries([
    { accountId: 'a', direction: 'debit', amountMinor: 500, currencyCode: 'INR' },
    { accountId: 'b', direction: 'credit', amountMinor: 500, currencyCode: 'INR' },
    { accountId: 'c', direction: 'debit', amountMinor: 1000, currencyCode: 'CAD' },
    { accountId: 'd', direction: 'credit', amountMinor: 900, currencyCode: 'CAD' },
  ]);
  assert.equal(result.balanced, false);
  assert.match(result.message, /CAD/);
  assert.doesNotMatch(result.message, /INR/);
});

test('rejects fewer than two entries', () => {
  const result = validateBalancedEntries([
    { accountId: 'a', direction: 'debit', amountMinor: 500, currencyCode: 'INR' },
  ]);
  assert.equal(result.balanced, false);
});

test('rejects a non-positive or non-integer amount', () => {
  const result = validateBalancedEntries([
    { accountId: 'a', direction: 'debit', amountMinor: 0, currencyCode: 'INR' },
    { accountId: 'b', direction: 'credit', amountMinor: 0, currencyCode: 'INR' },
  ]);
  assert.equal(result.balanced, false);
});

test('rejects an invalid direction', () => {
  const result = validateBalancedEntries([
    { accountId: 'a', direction: 'sideways', amountMinor: 500, currencyCode: 'INR' },
    { accountId: 'b', direction: 'credit', amountMinor: 500, currencyCode: 'INR' },
  ]);
  assert.equal(result.balanced, false);
});

test('a three-way split still balances as long as the currency nets to zero', () => {
  const result = validateBalancedEntries([
    { accountId: 'a', direction: 'debit', amountMinor: 1000, currencyCode: 'INR' },
    { accountId: 'b', direction: 'credit', amountMinor: 600, currencyCode: 'INR' },
    { accountId: 'c', direction: 'credit', amountMinor: 400, currencyCode: 'INR' },
  ]);
  assert.equal(result.balanced, true);
});
