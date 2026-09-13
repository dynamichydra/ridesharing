import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateProration,
} from '../src/modules/subscription/subscription-lifecycle.service.js';

describe('Commercial Subsystem v2: Subscription Lifecycle & State Transitions', () => {
  it('calculates proration credit and net charge correctly on plan upgrade', () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days ago
    const endDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);   // 15 days remaining (50% remaining)

    const currentSub = {
      status: 'active',
      startDate,
      endDate,
      amountMinor: 50000, // ₹500.00
    };

    const currentVersion = {
      priceMinor: 50000,
      durationDays: 30,
    };

    const newVersion = {
      priceMinor: 100000, // Upgrade to ₹1000.00 Plan
      durationDays: 30,
    };

    const proration = calculateProration(currentSub, currentVersion, newVersion);

    // 50% of ₹500 = ₹250 credit (25000 minor)
    assert.equal(proration.creditMinor, 25000);
    // Net charge = ₹1000 - ₹250 = ₹750 (75000 minor)
    assert.equal(proration.netChargeMinor, 75000);
    assert.equal(proration.remainingDays, 15);
  });

  it('handles proration when current subscription has no remaining duration or is expired', () => {
    const currentSub = {
      status: 'expired',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-01-31'),
      amountMinor: 50000,
    };

    const currentVersion = { priceMinor: 50000, durationDays: 30 };
    const newVersion = { priceMinor: 80000, durationDays: 30 };

    const proration = calculateProration(currentSub, currentVersion, newVersion);

    assert.equal(proration.creditMinor, 0);
    assert.equal(proration.netChargeMinor, 80000);
  });

  it('proration handles lifetime plans (no end date) gracefully without dividing by zero', () => {
    const currentSub = {
      status: 'active',
      startDate: new Date(),
      endDate: null,
      amountMinor: 200000,
    };

    const currentVersion = { priceMinor: 200000, durationDays: null };
    const newVersion = { priceMinor: 50000, durationDays: 30 };

    const proration = calculateProration(currentSub, currentVersion, newVersion);
    assert.equal(proration.creditMinor, 0);
    assert.equal(proration.netChargeMinor, 50000);
  });
});
