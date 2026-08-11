import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBalancedEntries } from '../src/modules/ledger/ledger.service.js';

// Helper to simulate the exact split ledger entries generation logic in ride-payment.service.js
function generateSplitLedgerEntries({ finalFareMinor, acceptedSplitsCount, commissionMinor, driverEarningsMinor, currencyCode, gatewayName }) {
  const totalParticipants = acceptedSplitsCount + 1;
  const baseShare = Math.floor(finalFareMinor / totalParticipants);
  const remainder = finalFareMinor - (baseShare * acceptedSplitsCount);

  const entries = [];

  // Debits
  // Inviter
  entries.push({ accountId: 'clearing:inviter', direction: 'debit', amountMinor: remainder, currencyCode });
  // Invitees
  for (let i = 0; i < acceptedSplitsCount; i++) {
    entries.push({ accountId: `clearing:invitee_${i}`, direction: 'debit', amountMinor: baseShare, currencyCode });
  }

  // Credits
  entries.push({
    accountId: 'wallet:driver',
    direction: 'credit',
    amountMinor: driverEarningsMinor,
    currencyCode,
  });

  if (commissionMinor > 0) {
    entries.push({ accountId: 'system:commission', direction: 'credit', amountMinor: commissionMinor, currencyCode });
  }

  return entries;
}

test('balances split ledger entries perfectly for an even split', () => {
  // $12.00 ride split 3 ways (1 inviter + 2 invitees). Commission = $2.00, Driver = $10.00.
  // Each pays $4.00.
  const entries = generateSplitLedgerEntries({
    finalFareMinor: 1200,
    acceptedSplitsCount: 2,
    commissionMinor: 200,
    driverEarningsMinor: 1000,
    currencyCode: 'INR',
    gatewayName: 'stripe'
  });

  assert.equal(entries.length, 5); // 3 debits + 2 credits
  assert.equal(entries[0].amountMinor, 400); // Inviter
  assert.equal(entries[1].amountMinor, 400); // Invitee 1
  assert.equal(entries[2].amountMinor, 400); // Invitee 2
  assert.equal(entries[3].amountMinor, 1000); // Driver Credit
  assert.equal(entries[4].amountMinor, 200); // Commission Credit

  const validation = validateBalancedEntries(entries);
  assert.equal(validation.balanced, true);
});

test('balances split ledger entries perfectly when there is a remainder', () => {
  // $10.00 ride split 3 ways (1 inviter + 2 invitees). Commission = $2.00, Driver = $8.00.
  // Share = 1000 / 3 = 333.
  // Invitees pay 333, Inviter pays 1000 - 666 = 334.
  const entries = generateSplitLedgerEntries({
    finalFareMinor: 1000,
    acceptedSplitsCount: 2,
    commissionMinor: 200,
    driverEarningsMinor: 800,
    currencyCode: 'INR',
    gatewayName: 'stripe'
  });

  assert.equal(entries.length, 5);
  assert.equal(entries[0].amountMinor, 334); // Inviter (got the 1 paisa remainder)
  assert.equal(entries[1].amountMinor, 333); // Invitee 1
  assert.equal(entries[2].amountMinor, 333); // Invitee 2
  assert.equal(entries[3].amountMinor, 800); // Driver
  assert.equal(entries[4].amountMinor, 200); // Commission

  const validation = validateBalancedEntries(entries);
  assert.equal(validation.balanced, true);
});

test('balances split ledger entries perfectly when commission is zero', () => {
  // $10.00 ride split 2 ways. Commission = 0, Driver = $10.00.
  const entries = generateSplitLedgerEntries({
    finalFareMinor: 1000,
    acceptedSplitsCount: 1,
    commissionMinor: 0,
    driverEarningsMinor: 1000,
    currencyCode: 'CAD',
    gatewayName: 'stripe'
  });

  assert.equal(entries.length, 3); // 2 debits + 1 credit (no commission entry)
  assert.equal(entries[0].amountMinor, 500); // Inviter
  assert.equal(entries[1].amountMinor, 500); // Invitee 1
  assert.equal(entries[2].amountMinor, 1000); // Driver

  const validation = validateBalancedEntries(entries);
  assert.equal(validation.balanced, true);
});
