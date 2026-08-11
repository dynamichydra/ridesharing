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
