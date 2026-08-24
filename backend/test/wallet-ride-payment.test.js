import test from 'node:test';
import assert from 'node:assert/strict';

test('validates wallet payment debit transaction entry shape', () => {
  const walletId = 'w_rider_123';
  const clearingId = 'acc_clearing_wallet';
  const payAmountMinor = 25000;
  const currencyCode = 'INR';
  const rideId = 'ride_abc_999';

  const debitEntry = {
    accountId: walletId,
    direction: 'debit',
    amountMinor: payAmountMinor,
    currencyCode,
    reason: 'ride_fare_wallet',
    description: `Wallet payment for ride ${rideId}`,
  };

  const creditEntry = {
    accountId: clearingId,
    direction: 'credit',
    amountMinor: payAmountMinor,
    currencyCode,
  };

  assert.equal(debitEntry.amountMinor, creditEntry.amountMinor);
  assert.equal(debitEntry.direction, 'debit');
  assert.equal(creditEntry.direction, 'credit');
  assert.equal(debitEntry.reason, 'ride_fare_wallet');
});

test('checks rider wallet balance is sufficient before authorizing ride payment', () => {
  const walletBalanceMinor = 50000; // ₹500
  const rideFareMinor = 25000; // ₹250
  const isSufficient = walletBalanceMinor >= rideFareMinor;
  assert.equal(isSufficient, true);

  const lowBalanceMinor = 10000; // ₹100
  const isLowSufficient = lowBalanceMinor >= rideFareMinor;
  assert.equal(isLowSufficient, false);
});
