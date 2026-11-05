import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  riderPhoneCountry,
  ipCountry,
  checkRiderRegion,
  assertPhoneMatchesRegion,
  RegionError,
} from '../src/modules/auth/rider-region.service.js';

// Pure parts of the rider India/Canada region lock — no DB, Redis or Google calls.

test('phone country: Indian mobiles and Canadian area codes only', () => {
  assert.equal(riderPhoneCountry('+919876543210'), 'IN');
  assert.equal(riderPhoneCountry('+91 98765 43210'), 'IN');
  assert.equal(riderPhoneCountry('+915876543210'), null, 'Indian mobiles start 6-9');
  assert.equal(riderPhoneCountry('+14165550123'), 'CA', 'Toronto 416');
  assert.equal(riderPhoneCountry('+16045550123'), 'CA', 'Vancouver 604');
  assert.equal(riderPhoneCountry('+12125550123'), null, 'New York 212 is US, not Canada');
  assert.equal(riderPhoneCountry('+447911123456'), null, 'UK');
  assert.equal(riderPhoneCountry('9876543210'), null, 'must be E.164');
});

test('phone must match the verified region (region lock on, as in production)', async (t) => {
  const { env } = await import('../src/config/env.js');
  const previous = env.RIDER_REGION_ENFORCEMENT;
  env.RIDER_REGION_ENFORCEMENT = 'on';
  t.after(() => { env.RIDER_REGION_ENFORCEMENT = previous; });

  assert.doesNotThrow(() => assertPhoneMatchesRegion('+919876543210', 'IN'));
  assert.throws(() => assertPhoneMatchesRegion('+14165550123', 'IN'), (e) => e.code === 'PHONE_COUNTRY_MISMATCH');
  assert.throws(() => assertPhoneMatchesRegion('+919876543210', 'CA'), (e) => e.code === 'PHONE_COUNTRY_MISMATCH');
  assert.throws(() => assertPhoneMatchesRegion('+12125550123', 'CA'), (e) => e.code === 'PHONE_NOT_SUPPORTED');
});

test('IP country lookup ignores private/loopback addresses', () => {
  assert.equal(ipCountry('49.36.0.1'), 'IN');
  assert.equal(ipCountry('::ffff:24.114.0.1'), 'CA');
  assert.equal(ipCountry('127.0.0.1'), null);
  assert.equal(ipCountry('10.0.2.2'), null);
  assert.equal(ipCountry(null), null);
});

test('device signals are rejected before any geocoding', async () => {
  const base = { lat: 19.076, lng: 72.8777, accuracyM: 20, fixAgeMs: 1000 };
  const codeOf = async (input) => {
    try { await checkRiderRegion(input); return 'allowed'; } catch (e) { assert.ok(e instanceof RegionError); return e.code; }
  };
  assert.equal(await codeOf({ ...base, isMocked: true }), 'MOCK_LOCATION');
  assert.equal(await codeOf({ ...base, isVpn: true }), 'VPN_DETECTED');
  assert.equal(await codeOf({ ...base, fixAgeMs: 10 * 60 * 1000 }), 'STALE_LOCATION');
  assert.equal(await codeOf({ ...base, accuracyM: 100000 }), 'LOW_ACCURACY');
  assert.equal(await codeOf({ ...base, lat: 'abc' }), 'LOCATION_REQUIRED');
});

test('rider payment profile: India → INR/Razorpay, Canada → CAD/Stripe, nothing else', async () => {
  const { paymentProfileForCountry, assertRiderGateway, assertRiderCurrency } = await import('../src/modules/rider/rider-payment-profile.js');
  assert.deepEqual(
    { ...paymentProfileForCountry('in') },
    { countryCode: 'IN', currencyCode: 'INR', currencySymbol: '₹', gateway: 'razorpay' },
  );
  assert.deepEqual(
    { ...paymentProfileForCountry('CA') },
    { countryCode: 'CA', currencyCode: 'CAD', currencySymbol: '$', gateway: 'stripe' },
  );
  assert.equal(paymentProfileForCountry('US'), null);
  const india = paymentProfileForCountry('IN');
  assert.throws(() => assertRiderGateway(india, 'stripe'), (e) => e.code === 'GATEWAY_NOT_ALLOWED');
  assert.doesNotThrow(() => assertRiderGateway(india, 'RAZORPAY'));
  assert.throws(() => assertRiderCurrency(india, 'CAD'), (e) => e.code === 'CURRENCY_NOT_ALLOWED');
});

test('travelling: account country mismatch tells the rider which account to use', async () => {
  const { accountCountryMismatchMessage } = await import('../src/modules/auth/rider-region.service.js');
  assert.match(accountCountryMismatchMessage('IN', 'CA'), /registered in India.*in Canada now.*Canadian account/);
  assert.match(accountCountryMismatchMessage('CA', 'IN'), /registered in Canada.*in India now.*Indian account/);
});

test('driver commission defaults: 15% free, 5% with a subscription', async () => {
  const { defaultCommissionRate } = await import('../src/modules/commission/commission-defaults.js');
  const { calculateRideFinancialBreakdown } = await import('../src/modules/ride-financial/ride-financial.service.js');
  assert.equal(defaultCommissionRate(false), 0.15);
  assert.equal(defaultCommissionRate(true), 0.05);
  // No configured rule → defaults apply on a ₹500 fare
  const free = calculateRideFinancialBreakdown({ grossFareMinor: 50000, rule: null, driverEntitlements: { isSubscriber: false } });
  const plan = calculateRideFinancialBreakdown({ grossFareMinor: 50000, rule: null, driverEntitlements: { isSubscriber: true } });
  assert.equal(free.commissionMinor, 7500);
  assert.equal(free.driverEarningMinor, 42500);
  assert.equal(plan.commissionMinor, 2500);
  assert.equal(plan.driverEarningMinor, 47500);
});

test('local dev (lock off) accepts any +1 number as Canadian; production keeps the area-code list', () => {
  assert.equal(riderPhoneCountry('+18746546545'), null, '874 is not a Canadian area code');
  assert.equal(riderPhoneCountry('+18746546545', { strictCanadianAreaCodes: false }), 'CA');
  assert.equal(riderPhoneCountry('+919876543210', { strictCanadianAreaCodes: false }), 'IN');
});
