import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  multiplyRate,
  reconcileSplits,
  verifyDoubleEntryBalance,
  ROUNDING_POLICIES,
} from '../src/utils/money-math.js';

describe('Commercial Subsystem v2: Double-Entry Ledger & Split Invariants', () => {
  it('verifies double-entry ledger balance invariant (Debits strictly equal Credits)', () => {
    // Scenario: ₹500 ride with ₹100 promo discount absorbed by platform
    // Rider pays ₹400 online
    // Driver earned ₹408
    // Platform revenue = ₹92 commission - ₹100 subsidy = -₹8
    const entries = [
      { accountId: 'clearing-psp', direction: 'debit', amountMinor: 40000, currencyCode: 'INR' },    // Dr Clearing ₹400
      { accountId: 'platform-subsidy', direction: 'debit', amountMinor: 10000, currencyCode: 'INR' },// Dr Platform Subsidy ₹100
      { accountId: 'driver-wallet', direction: 'credit', amountMinor: 40800, currencyCode: 'INR' },  // Cr Driver Wallet ₹408
      { accountId: 'platform-comm', direction: 'credit', amountMinor: 9200, currencyCode: 'INR' },   // Cr Platform Comm ₹92
    ];

    const balanceCheck = verifyDoubleEntryBalance(entries);

    assert.equal(balanceCheck.isBalanced, true);
    assert.equal(balanceCheck.totalDebits, 50000);
    assert.equal(balanceCheck.totalCredits, 50000);
    assert.equal(balanceCheck.delta, 0);
  });

  it('reconciles splits with zero-loss penny precision', () => {
    // Split ₹100.00 into 3 unequal shares [33.33%, 33.33%, 33.34%]
    const totalMinor = 10000; // 10000 paise
    const ratios = [1, 1, 1]; // 3-way split

    const splits = reconcileSplits(totalMinor, ratios);

    // Sum of shares MUST be exactly 10000 paise without losing 1 paise
    const sumSplits = splits.reduce((acc, s) => acc + s, 0);
    assert.equal(sumSplits, totalMinor);
    assert.deepEqual(splits, [3333, 3333, 3334]);
  });

  it('applies ROUND_HALF_UP rounding policy consistently without floating point drift', () => {
    // 333 paise * 15% (0.1500) = 49.95 -> rounds up to 50
    const res1 = multiplyRate(333, '0.1500', ROUNDING_POLICIES.ROUND_HALF_UP);
    assert.equal(res1, 50);

    // 330 paise * 15% (0.1500) = 49.50 -> rounds up to 50
    const res2 = multiplyRate(330, '0.1500', ROUNDING_POLICIES.ROUND_HALF_UP);
    assert.equal(res2, 50);

    // 329 paise * 15% (0.1500) = 49.35 -> rounds down to 49
    const res3 = multiplyRate(329, '0.1500', ROUNDING_POLICIES.ROUND_HALF_UP);
    assert.equal(res3, 49);
  });
});
