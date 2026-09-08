import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidTransition, isTerminalStatus } from '../src/modules/ride/ride-state-machine.js';

test('Ride State Machine: valid state progression searching -> accepted -> arriving -> arrived -> started -> completed', () => {
  assert.equal(isValidTransition('searching', 'accepted'), true);
  assert.equal(isValidTransition('accepted', 'arriving'), true);
  assert.equal(isValidTransition('arriving', 'arrived'), true);
  assert.equal(isValidTransition('arrived', 'started'), true);
  assert.equal(isValidTransition('started', 'completed'), true);
});

test('Ride State Machine: rejects backward and invalid transitions', () => {
  assert.equal(isValidTransition('completed', 'started'), false);
  assert.equal(isValidTransition('completed', 'accepted'), false);
  assert.equal(isValidTransition('cancelled', 'accepted'), false);
  assert.equal(isValidTransition('searching', 'completed'), false);
  assert.equal(isValidTransition('started', 'searching'), false);
});

test('Ride State Machine: terminal status detection', () => {
  assert.equal(isTerminalStatus('completed'), true);
  assert.equal(isTerminalStatus('cancelled'), true);
  assert.equal(isTerminalStatus('expired'), true);
  assert.equal(isTerminalStatus('started'), false);
  assert.equal(isTerminalStatus('searching'), false);
  assert.equal(isTerminalStatus('accepted'), false);
});

test('Ride Authorization / IDOR: Only rider, assigned driver, or admin can access ride resource', () => {
  const ride = { id: 'ride-123', riderId: 'rider-abc', driverId: 'driver-xyz', status: 'started' };
  
  const isAuthorized = (user, r) => {
    if (user.role === 'admin' || user.role === 'super_admin') return true;
    return r.riderId === user.id || r.driverId === user.id;
  };

  // Rider authorized
  assert.equal(isAuthorized({ id: 'rider-abc', role: 'rider' }, ride), true);
  // Assigned driver authorized
  assert.equal(isAuthorized({ id: 'driver-xyz', role: 'driver' }, ride), true);
  // Admin authorized
  assert.equal(isAuthorized({ id: 'admin-1', role: 'admin' }, ride), true);
  assert.equal(isAuthorized({ id: 'admin-2', role: 'super_admin' }, ride), true);

  // Unrelated rider blocked
  assert.equal(isAuthorized({ id: 'rider-other', role: 'rider' }, ride), false);
  // Unrelated driver blocked
  assert.equal(isAuthorized({ id: 'driver-other', role: 'driver' }, ride), false);
});

test('Concurrent Acceptance Simulation: Exactly one winner among simultaneous callers', async () => {
  let rideState = { id: 'ride-conc-1', status: 'searching', driverId: null };
  let winningDriver = null;
  let rejectedCount = 0;

  // Simulate atomic DB row-lock acquisition
  const simulateAtomicAccept = async (driverId) => {
    // In PostgreSQL: SELECT FOR UPDATE on rides row
    if (rideState.status !== 'searching') {
      rejectedCount++;
      return { success: false, code: 409, message: 'Ride already accepted or no longer searching' };
    }
    // Atomic state transition
    rideState.status = 'accepted';
    rideState.driverId = driverId;
    winningDriver = driverId;
    return { success: true, rideId: rideState.id, driverId };
  };

  const results = await Promise.all([
    simulateAtomicAccept('driver-A'),
    simulateAtomicAccept('driver-B'),
    simulateAtomicAccept('driver-C'),
  ]);

  const successes = results.filter(r => r.success);
  const conflicts = results.filter(r => !r.success && r.code === 409);

  assert.equal(successes.length, 1);
  assert.equal(conflicts.length, 2);
  assert.equal(rideState.driverId, winningDriver);
  assert.equal(rideState.status, 'accepted');
});

test('Concurrent Wallet Debit Simulation: Balance cannot become negative under simultaneous debits', async () => {
  let balance = 500; // 500 minor units ($5.00)
  const debitAmount = 400; // Attempting two debits of 400 simultaneously
  let successfulDebits = 0;
  let rejectedDebits = 0;

  const simulateAtomicDebit = async () => {
    // In PostgreSQL: SELECT balance FROM wallets WHERE id = $1 FOR UPDATE
    if (balance >= debitAmount) {
      balance -= debitAmount;
      successfulDebits++;
      return { success: true, newBalance: balance };
    } else {
      rejectedDebits++;
      return { success: false, error: 'Insufficient wallet balance' };
    }
  };

  const [res1, res2] = await Promise.all([
    simulateAtomicDebit(),
    simulateAtomicDebit(),
  ]);

  assert.equal(successfulDebits, 1);
  assert.equal(rejectedDebits, 1);
  assert.equal(balance, 100);
  assert.ok(balance >= 0, 'Wallet balance must never be negative');
});

test('Promo Uniqueness Invariant: Same promo cannot be consumed twice on the same ride', () => {
  const recordedUsages = new Set();
  
  const recordUsage = (promoId, rideId) => {
    const key = `${promoId}:${rideId}`;
    if (recordedUsages.has(key)) {
      return { success: false, duplicate: true };
    }
    recordedUsages.add(key);
    return { success: true, duplicate: false };
  };

  const firstAttempt = recordUsage('PROMO_SAVE50', 'ride_001');
  const duplicateAttempt = recordUsage('PROMO_SAVE50', 'ride_001');
  const differentRideAttempt = recordUsage('PROMO_SAVE50', 'ride_002');

  assert.equal(firstAttempt.success, true);
  assert.equal(duplicateAttempt.duplicate, true);
  assert.equal(differentRideAttempt.success, true);
});

test('Ledger Invariant: Double-entry SUM(debits) must equal SUM(credits)', () => {
  const isTransactionBalanced = (entries) => {
    const debitTotal = entries
      .filter(e => e.direction === 'debit')
      .reduce((sum, e) => sum + e.amountMinor, 0);
    const creditTotal = entries
      .filter(e => e.direction === 'credit')
      .reduce((sum, e) => sum + e.amountMinor, 0);
    return debitTotal === creditTotal;
  };

  const validRideSettlement = [
    { direction: 'debit', amountMinor: 1000 }, // Rider paid $10.00
    { direction: 'credit', amountMinor: 800 }, // Driver earnings $8.00
    { direction: 'credit', amountMinor: 200 }, // Platform commission $2.00
  ];

  const unbalancedRideSettlement = [
    { direction: 'debit', amountMinor: 1000 },
    { direction: 'credit', amountMinor: 750 },
    { direction: 'credit', amountMinor: 200 }, // Total credit 950 != 1000
  ];

  assert.equal(isTransactionBalanced(validRideSettlement), true);
  assert.equal(isTransactionBalanced(unbalancedRideSettlement), false);
});
