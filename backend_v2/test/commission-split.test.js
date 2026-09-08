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

test('driver earnings are protected on promo trips with dynamic subscriber vs non-subscriber rules', () => {
  const dynamicRule = {
    name: 'Bangalore Sedan Rule',
    bookingFeeMinor: 2000,      // ₹20 booking fee
    nonSubscriberRate: '0.20',  // 20% for non-subscribers
    subscriberRate: '0.05',     // 5% for subscribers
  };

  const grossFareMinor = 50000;       // ₹500.00 Gross Metered Trip Fare
  const promoDiscountMinor = 10000;   // ₹100.00 Rider Promo Discount
  const riderPaidMinor = 40000;       // ₹400.00 Net Rider Paid

  // 1. Subscribed Driver (5% rate + ₹20 booking fee):
  // Booking fee = 2000 (₹20)
  // Remainder = 48000 (₹480)
  // Variable cut (5% of 48000) = 2400 (₹24)
  // Platform Commission = 2000 + 2400 = 4400 (₹44)
  // Driver Earnings = 50000 - 4400 = 45600 (₹456)
  const subResult = computeCommission({
    finalFareMinor: grossFareMinor,
    rule: dynamicRule,
    isSubscriber: true,
  });

  assert.equal(subResult.commissionMinor, 4400);
  assert.equal(subResult.driverEarningsMinor, 45600);
  assert.equal(subResult.driverEarningsMinor + subResult.commissionMinor, grossFareMinor);

  // 2. Non-Subscribed Driver (20% rate + ₹20 booking fee):
  // Remainder = 48000 (₹480)
  // Variable cut (20% of 48000) = 9600 (₹96)
  // Platform Commission = 2000 + 9600 = 11600 (₹116)
  // Driver Earnings = 50000 - 11600 = 38400 (₹384)
  const nonSubResult = computeCommission({
    finalFareMinor: grossFareMinor,
    rule: dynamicRule,
    isSubscriber: false,
  });

  assert.equal(nonSubResult.commissionMinor, 11600);
  assert.equal(nonSubResult.driverEarningsMinor, 38400);
  assert.equal(nonSubResult.driverEarningsMinor + nonSubResult.commissionMinor, grossFareMinor);
});

test('online promo payment ledger entries perfectly balance with platform marketing subsidy', async () => {
  const { validateBalancedEntries } = await import('../src/modules/ledger/ledger.service.js');

  const grossFareMinor = 50000;       // ₹500 Gross Fare
  const promoDiscountMinor = 10000;   // ₹100 Rider Promo
  const riderPaidMinor = 40000;       // ₹400 Rider Paid Online
  const driverEarningsMinor = 45600;  // ₹456 Driver Take-Home
  const commissionMinor = 4400;       // ₹44 Platform Cut

  // Double-Entry Ledger Transaction:
  const onlineEntries = [
    { direction: 'debit', amountMinor: riderPaidMinor, currencyCode: 'INR' },           // Processor clearing
    { direction: 'debit', amountMinor: promoDiscountMinor, currencyCode: 'INR' },       // Platform marketing subsidy
    { direction: 'credit', amountMinor: driverEarningsMinor, currencyCode: 'INR' },     // Driver Wallet
    { direction: 'credit', amountMinor: commissionMinor, currencyCode: 'INR' },         // Platform Commission Revenue
  ];

  const validation = validateBalancedEntries(onlineEntries);
  assert.equal(validation.balanced, true, 'Online promo ledger entries must balance to zero');
});

test('cash promo payment ledger entries perfectly balance when platform pays promo subsidy to subscriber driver', async () => {
  const { validateBalancedEntries } = await import('../src/modules/ledger/ledger.service.js');

  const grossFareMinor = 50000;       // ₹500 Gross Fare
  const promoDiscountMinor = 10000;   // ₹100 Promo Discount
  const commissionMinor = 2000;       // ₹20 Booking fee only (0% rate subscriber)
  // Net settlement: Platform owes driver (10000 - 2000 = 8000)
  const subsidyPayoutMinor = promoDiscountMinor - commissionMinor; // 8000

  // Cash Subsidy Payout Transaction:
  const cashSubsidyEntries = [
    { direction: 'debit', amountMinor: subsidyPayoutMinor, currencyCode: 'INR' },       // Platform Marketing Subsidy
    { direction: 'credit', amountMinor: subsidyPayoutMinor, currencyCode: 'INR' },      // Driver Wallet Credit
  ];

  const validation = validateBalancedEntries(cashSubsidyEntries);
  assert.equal(validation.balanced, true, 'Cash promo subsidy payout entries must balance to zero');
});



