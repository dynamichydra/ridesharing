import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRideFinancialBreakdown } from '../src/modules/ride-financial/ride-financial.service.js';

describe('Commercial Subsystem v2: Pure Commission Calculation & Configurable Bases', () => {
  it('calculates commission based on fare_after_booking_fee (standard rideshare base)', () => {
    // Passenger fare = ₹500 (50,000 paise)
    // Booking fee = ₹20 (2,000 paise)
    // Subscriber rate = 15% (0.1500)
    const result = calculateRideFinancialBreakdown({
      grossFareMinor: 50000,
      promoDiscountMinor: 0,
      rule: {
        id: 'rule-1',
        version: 1,
        name: 'India Standard',
        bookingFeeMinor: 2000,
        platformFeeMinor: 0,
        subscriberRate: '0.1500',
        nonSubscriberRate: '0.2500',
        commissionBase: 'fare_after_booking_fee',
        minCommissionMinor: 0,
        maxCommissionMinor: null,
      },
      driverEntitlements: {
        isSubscriber: true,
        waiveBookingFee: false,
      },
      currencyCode: 'INR',
    });

    // Commission Base = 50000 - 2000 = 48000 paise (₹480)
    assert.equal(result.commissionBaseMinor, 48000);
    // Variable Commission = 48000 * 0.15 = 7200 paise (₹72)
    assert.equal(result.variableCommissionMinor, 7200);
    // Total Platform Commission = 2000 (Booking Fee) + 7200 = 9200 paise (₹92)
    assert.equal(result.commissionMinor, 9200);
    // Driver Earning = 50000 - 9200 = 40800 paise (₹408)
    assert.equal(result.driverEarningMinor, 40800);
    // Platform Revenue = 9200 paise (₹92)
    assert.equal(result.platformRevenueMinor, 9200);
    // Check integrity: Driver + Platform = Gross Fare
    assert.equal(result.driverEarningMinor + result.platformRevenueMinor, 50000);
  });

  it('calculates commission based on gross_fare base', () => {
    // Passenger fare = ₹500 (50,000 paise)
    // Booking fee = ₹20 (2,000 paise)
    // Non-subscriber rate = 20% on gross fare
    const result = calculateRideFinancialBreakdown({
      grossFareMinor: 50000,
      promoDiscountMinor: 0,
      rule: {
        id: 'rule-2',
        version: 1,
        name: 'Gross Fare Model',
        bookingFeeMinor: 2000,
        platformFeeMinor: 0,
        subscriberRate: '0.1000',
        nonSubscriberRate: '0.2000',
        commissionBase: 'gross_fare',
      },
      driverEntitlements: {
        isSubscriber: false,
      },
      currencyCode: 'INR',
    });

    // Commission Base = 50000 paise
    assert.equal(result.commissionBaseMinor, 50000);
    // Variable Commission = 50000 * 0.20 = 10000 paise
    assert.equal(result.variableCommissionMinor, 10000);
    // Total Platform Commission = 2000 + 10000 = 12000 paise (₹120)
    assert.equal(result.commissionMinor, 12000);
    // Driver Take-Home = 50000 - 12000 = 38000 paise (₹380)
    assert.equal(result.driverEarningMinor, 38000);
  });

  it('respects subscription entitlement fee waiver (0% commission & waived booking fee)', () => {
    // 0-commission subscription plan with booking fee waived
    const result = calculateRideFinancialBreakdown({
      grossFareMinor: 50000,
      promoDiscountMinor: 0,
      rule: {
        id: 'rule-3',
        bookingFeeMinor: 2500,
        subscriberRate: '0.1500',
        nonSubscriberRate: '0.2500',
        commissionBase: 'fare_after_booking_fee',
      },
      driverEntitlements: {
        isSubscriber: true,
        waiveBookingFee: true,
        commissionDiscountRate: 0.0000, // 0% commission plan
      },
      currencyCode: 'INR',
    });

    assert.equal(result.bookingFeeMinor, 0);
    assert.equal(result.commissionMinor, 0);
    assert.equal(result.driverEarningMinor, 50000); // 100% take-home
    assert.equal(result.platformRevenueMinor, 0);
  });

  it('protects driver earnings when platform marketing promo is applied', () => {
    // Gross Fare: ₹500 (50,000 paise)
    // Rider Promo Discount: ₹100 (10,000 paise) -> Rider pays ₹400
    // Platform absorbs the ₹100 discount as marketing subsidy
    const result = calculateRideFinancialBreakdown({
      grossFareMinor: 50000,
      promoDiscountMinor: 10000,
      rule: {
        id: 'rule-4',
        bookingFeeMinor: 2000,
        subscriberRate: '0.1500',
        nonSubscriberRate: '0.2500',
        commissionBase: 'fare_after_booking_fee',
      },
      driverEntitlements: {
        isSubscriber: true,
      },
      currencyCode: 'INR',
    });

    // Driver earning is calculated on unpenalized gross fare (₹500 - ₹92 = ₹408)
    assert.equal(result.driverEarningMinor, 40800);
    assert.equal(result.platformSubsidyMinor, 10000);
    // Net Platform Revenue = ₹92 commission - ₹100 subsidy = -₹8 (-800 minor)
    assert.equal(result.platformRevenueMinor, -800);
  });
});
