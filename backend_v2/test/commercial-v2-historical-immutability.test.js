import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRideFinancialBreakdown } from '../src/modules/ride-financial/ride-financial.service.js';

describe('Commercial Subsystem v2: Critical Historical Immutability Guarantee', () => {
  it('historical ride calculation snapshot NEVER changes when admin updates commission rule version tomorrow', () => {
    // ── Day 1 (Sept 10, 2026): Rule Version 1 is active ──
    const commissionRuleV1 = {
      id: 'comm-rule-101',
      version: 1,
      name: 'City Standard Rule',
      bookingFeeMinor: 2000, // ₹20
      subscriberRate: '0.1500', // 15%
      nonSubscriberRate: '0.2500', // 25%
      commissionBase: 'fare_after_booking_fee',
      effectiveFrom: new Date('2026-01-01T00:00:00Z'),
      effectiveTo: null,
    };

    const driverSubOnDay1 = {
      isSubscriber: true,
      subscriptionId: 'sub-701',
      planId: 'plan-gold',
      planVersion: 1,
    };

    // Passenger Ride A takes place on Sept 10
    const rideAFinancialSnapshot = calculateRideFinancialBreakdown({
      grossFareMinor: 50000, // ₹500
      rule: commissionRuleV1,
      driverEntitlements: driverSubOnDay1,
      currencyCode: 'INR',
    });

    // Verify Day 1 calculations
    assert.equal(rideAFinancialSnapshot.commissionRuleVersion, 1);
    assert.equal(rideAFinancialSnapshot.commissionRate, '0.1500');
    assert.equal(rideAFinancialSnapshot.bookingFeeMinor, 2000);
    assert.equal(rideAFinancialSnapshot.commissionMinor, 9200);      // ₹92.00
    assert.equal(rideAFinancialSnapshot.driverEarningMinor, 40800);   // ₹408.00
    assert.equal(rideAFinancialSnapshot.platformRevenueMinor, 9200);  // ₹92.00

    // ── Day 2 (Sept 11, 2026): Admin updates commission rule to Version 2 ──
    // Admin creates Rule Version 2: Commission increases from 15% -> 18%, Booking fee increases ₹20 -> ₹25
    const commissionRuleV2 = {
      id: 'comm-rule-101',
      version: 2,
      name: 'City Standard Rule (Revised)',
      bookingFeeMinor: 2500, // ₹25
      subscriberRate: '0.1800', // 18%
      nonSubscriberRate: '0.2800', // 28%
      commissionBase: 'fare_after_booking_fee',
      effectiveFrom: new Date('2026-09-11T00:00:00Z'),
      effectiveTo: null,
    };

    // Passenger Ride B takes place on Sept 11
    const rideBFinancialSnapshot = calculateRideFinancialBreakdown({
      grossFareMinor: 50000, // ₹500
      rule: commissionRuleV2,
      driverEntitlements: driverSubOnDay1,
      currencyCode: 'INR',
    });

    // Verify Day 2 calculations for Ride B
    assert.equal(rideBFinancialSnapshot.commissionRuleVersion, 2);
    assert.equal(rideBFinancialSnapshot.commissionRate, '0.1800');
    assert.equal(rideBFinancialSnapshot.bookingFeeMinor, 2500);
    // Base = 50000 - 2500 = 47500 paise
    // Variable Commission = 47500 * 0.18 = 8550 paise
    // Total Commission = 2500 + 8550 = 11050 paise (₹110.50)
    assert.equal(rideBFinancialSnapshot.commissionMinor, 11050);
    // Driver Take-Home = 50000 - 11050 = 38950 paise (₹389.50)
    assert.equal(rideBFinancialSnapshot.driverEarningMinor, 38950);
    assert.equal(rideBFinancialSnapshot.platformRevenueMinor, 11050);

    // ── AUDIT & HISTORICAL VERIFICATION: Ride A MUST REMAIN UNTOUCHED ──
    // Re-evaluating Ride A using its locked snapshot / Version 1 reference
    assert.equal(rideAFinancialSnapshot.commissionRuleVersion, 1);
    assert.equal(rideAFinancialSnapshot.commissionRate, '0.1500');
    assert.equal(rideAFinancialSnapshot.driverEarningMinor, 40800); // Strictly ₹408
    assert.equal(rideAFinancialSnapshot.platformRevenueMinor, 9200); // Strictly ₹92
    assert.notEqual(rideAFinancialSnapshot.driverEarningMinor, rideBFinancialSnapshot.driverEarningMinor);
  });
});
