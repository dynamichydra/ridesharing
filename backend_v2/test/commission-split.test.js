import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCommission } from '../src/modules/commission/commission.service.js';

test('calculates non-subscriber driver earnings and system commission correctly', () => {
  const rule = {
    bookingFeeMinor: 200,      // $2.00 booking fee
    nonSubscriberRate: '0.20', // 20% platform cut
    subscriberRate: '0.05',    // 5% platform cut for active subscribers
  };

  // Ride Fare = $20.00 (2000 minor units)
  // Booking fee = $2.00 (200)
  // Remainder = $18.00 (1800)
  // Platform cut (20% of 1800) = $3.60 (360)
  // Total System Commission = $2.00 + $3.60 = $5.60 (560)
  // Driver Earnings = $20.00 - $5.60 = $14.40 (1440)
  const res = computeCommission({
    finalFareMinor: 2000,
    rule,
    isSubscriber: false,
  });

  assert.equal(res.bookingFeeMinor, 200);
  assert.equal(res.rate, 0.20);
  assert.equal(res.commissionMinor, 560);       // System Commission
  assert.equal(res.driverEarningsMinor, 1440);   // Driver Net Earnings
  assert.equal(res.commissionMinor + res.driverEarningsMinor, 2000); // Sum equals total fare
});

test('calculates active subscriber driver discounted commission correctly', () => {
  const rule = {
    bookingFeeMinor: 200,      // $2.00 booking fee
    nonSubscriberRate: '0.20', // 20% for normal drivers
    subscriberRate: '0.05',    // 5% for subscribed drivers
  };

  // Subscribed Driver gets 5% rate cut instead of 20%:
  // Booking fee = $2.00 (200)
  // Remainder = $18.00 (1800)
  // Platform cut (5% of 1800) = $0.90 (90)
  // Total System Commission = $2.00 + $0.90 = $2.90 (290)
  // Subscribed Driver Earnings = $20.00 - $2.90 = $17.10 (1710)
  const res = computeCommission({
    finalFareMinor: 2000,
    rule,
    isSubscriber: true,
  });

  assert.equal(res.rate, 0.05);
  assert.equal(res.commissionMinor, 290);       // System Commission
  assert.equal(res.driverEarningsMinor, 1710);   // Subscribed Driver Net Earnings
  assert.equal(res.commissionMinor + res.driverEarningsMinor, 2000);
});

test('clamps commission to minCommissionMinor (floor limit) when calculated cut is below floor', () => {
  const rule = {
    bookingFeeMinor: 1000,      // ₹10 booking fee (1000 minor)
    nonSubscriberRate: '0.10',  // 10%
    subscriberRate: '0.05',
    minCommissionMinor: 2500,   // ₹25 minimum floor platform cut
  };

  // Fare = ₹100 (10000 minor)
  // Booking fee = ₹10 (1000)
  // Remainder = ₹90 (9000)
  // Variable cut (10% of 9000) = ₹9 (900)
  // Raw cut = 1000 + 900 = 1900 (₹19) -> Lower than min floor of 2500 (₹25)!
  // Clamped Commission = 2500
  // Driver Earnings = 10000 - 2500 = 7500 (₹75)
  const res = computeCommission({
    finalFareMinor: 10000,
    rule,
    isSubscriber: false,
  });

  assert.equal(res.commissionMinor, 2500);
  assert.equal(res.driverEarningsMinor, 7500);
  assert.equal(res.minCommissionMinor, 2500);
  assert.equal(res.commissionMinor + res.driverEarningsMinor, 10000);
});

test('clamps commission to maxCommissionMinor (ceiling cap) when calculated cut exceeds cap', () => {
  const rule = {
    bookingFeeMinor: 2000,      // ₹20 booking fee
    nonSubscriberRate: '0.25',  // 25% platform cut
    subscriberRate: '0.15',
    maxCommissionMinor: 50000,  // ₹500 maximum ceiling cap (e.g. outstation ride)
  };

  // Long outstation trip: Fare = ₹3,000 (300000 minor)
  // Booking fee = ₹20 (2000)
  // Remainder = ₹2,980 (298000)
  // Variable cut (25% of 298000) = 74500
  // Raw cut = 2000 + 74500 = 76500 (₹765) -> Exceeds cap of 50000 (₹500)!
  // Clamped Commission = 50000
  // Driver Earnings = 300000 - 50000 = 250000 (₹2,500)
  const res = computeCommission({
    finalFareMinor: 300000,
    rule,
    isSubscriber: false,
  });

  assert.equal(res.commissionMinor, 50000);
  assert.equal(res.driverEarningsMinor, 250000);
  assert.equal(res.maxCommissionMinor, 50000);
  assert.equal(res.commissionMinor + res.driverEarningsMinor, 300000);
});

test('commission does not exceed total fare even if min floor is higher than small trip fare', () => {
  const rule = {
    bookingFeeMinor: 1500,      // ₹15
    nonSubscriberRate: '0.20',
    subscriberRate: '0.10',
    minCommissionMinor: 5000,   // ₹50 floor
  };

  // Short trip fare: ₹40 (4000 minor) < 5000 floor
  const res = computeCommission({
    finalFareMinor: 4000,
    rule,
    isSubscriber: false,
  });

  assert.equal(res.commissionMinor, 4000); // capped at total fare
  assert.equal(res.driverEarningsMinor, 0);
  assert.equal(res.commissionMinor + res.driverEarningsMinor, 4000);
});

test('commissionRules schema exports cityId, minCommissionMinor, and maxCommissionMinor columns', async () => {
  const { commissionRules } = await import('../drizzle/schema/index.js');
  assert.ok(commissionRules.cityId, 'cityId column exists in commissionRules schema');
  assert.ok(commissionRules.countryId, 'countryId column exists in commissionRules schema');
  assert.ok(commissionRules.vehicleTypeId, 'vehicleTypeId column exists in commissionRules schema');
  assert.ok(commissionRules.minCommissionMinor, 'minCommissionMinor column exists in commissionRules schema');
  assert.ok(commissionRules.maxCommissionMinor, 'maxCommissionMinor column exists in commissionRules schema');
});


