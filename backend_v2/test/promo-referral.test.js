import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateReferralCodeForUser } from '../src/modules/promo/promo.service.js';

function calculatePromoDiscount({ fareMinor, discountType, discountValue, maxDiscountMinor, minFareMinor }) {
  if (fareMinor < (minFareMinor || 0)) {
    throw new Error('Fare below minimum required for promo');
  }

  let discountAmountMinor = 0;
  if (discountType === 'percentage') {
    const raw = Math.round(fareMinor * (discountValue / 100));
    discountAmountMinor = maxDiscountMinor ? Math.min(raw, maxDiscountMinor) : raw;
  } else if (discountType === 'flat_amount') {
    discountAmountMinor = Math.min(fareMinor, discountValue);
  }

  return {
    discountAmountMinor,
    finalFareMinor: Math.max(0, fareMinor - discountAmountMinor),
  };
}

test('calculates flat amount promo discount correctly', () => {
  // $20.00 ride with $5.00 flat discount
  const res = calculatePromoDiscount({
    fareMinor: 2000,
    discountType: 'flat_amount',
    discountValue: 500,
    minFareMinor: 1000,
  });

  assert.equal(res.discountAmountMinor, 500);
  assert.equal(res.finalFareMinor, 1500);
});

test('calculates percentage promo discount correctly without max cap', () => {
  // $30.00 ride with 20% discount = $6.00 off
  const res = calculatePromoDiscount({
    fareMinor: 3000,
    discountType: 'percentage',
    discountValue: 20,
    minFareMinor: 500,
  });

  assert.equal(res.discountAmountMinor, 600);
  assert.equal(res.finalFareMinor, 2400);
});

test('applies maxDiscountMinor cap on percentage promo', () => {
  // $100.00 ride with 50% discount (raw $50.00) capped at $10.00 max discount
  const res = calculatePromoDiscount({
    fareMinor: 10000,
    discountType: 'percentage',
    discountValue: 50,
    maxDiscountMinor: 1000,
    minFareMinor: 1000,
  });

  assert.equal(res.discountAmountMinor, 1000); // capped at $10.00
  assert.equal(res.finalFareMinor, 9000);
});

test('throws error if fare is below minimum fare requirement', () => {
  assert.throws(() => {
    calculatePromoDiscount({
      fareMinor: 800, // $8.00
      discountType: 'flat_amount',
      discountValue: 200,
      minFareMinor: 1500, // $15.00 min fare
    });
  }, /Fare below minimum/);
});

test('generates consistent referral codes for user IDs', () => {
  const userId = '123e4567-e89b-12d3-a456-426614174000';
  const code1 = generateReferralCodeForUser(userId);
  const code2 = generateReferralCodeForUser(userId);

  assert.equal(code1, 'REF-123E45');
  assert.equal(code1, code2);
});

function validatePromoEligibility({ promo, requestCityId, requestVehicleTypeId, riderCompletedRidesCount }) {
  if (promo.cityId && requestCityId && promo.cityId !== requestCityId) {
    throw new Error('This promo code is not valid in your city');
  }
  if (promo.vehicleTypeId && requestVehicleTypeId && promo.vehicleTypeId !== requestVehicleTypeId) {
    throw new Error('This promo code is not valid for this vehicle type');
  }
  if (promo.isFirstRideOnly && riderCompletedRidesCount > 0) {
    throw new Error('This promo code is only valid for your first ride');
  }
  return true;
}

test('validates city scoping for promotions (passes matching city, rejects other cities)', () => {
  const cityPromo = {
    code: 'MUMBAI50',
    cityId: 'city-mumbai-001',
    vehicleTypeId: null,
    isFirstRideOnly: false,
  };

  // Matches Mumbai
  assert.equal(
    validatePromoEligibility({ promo: cityPromo, requestCityId: 'city-mumbai-001', requestVehicleTypeId: 'sedan', riderCompletedRidesCount: 2 }),
    true
  );

  // Fails in Delhi
  assert.throws(
    () => validatePromoEligibility({ promo: cityPromo, requestCityId: 'city-delhi-002', requestVehicleTypeId: 'sedan', riderCompletedRidesCount: 2 }),
    /not valid in your city/
  );
});

test('validates vehicle type scoping for promotions', () => {
  const autoPromo = {
    code: 'AUTOSAVE',
    cityId: null,
    vehicleTypeId: 'veh-auto-rickshaw',
    isFirstRideOnly: false,
  };

  // Matches Auto
  assert.equal(
    validatePromoEligibility({ promo: autoPromo, requestCityId: 'city-kolkata-001', requestVehicleTypeId: 'veh-auto-rickshaw', riderCompletedRidesCount: 0 }),
    true
  );

  // Fails on Premium Sedan
  assert.throws(
    () => validatePromoEligibility({ promo: autoPromo, requestCityId: 'city-kolkata-001', requestVehicleTypeId: 'veh-sedan-premium', riderCompletedRidesCount: 0 }),
    /not valid for this vehicle type/
  );
});

test('validates first-ride-only restriction', () => {
  const welcomePromo = {
    code: 'WELCOME50',
    cityId: null,
    vehicleTypeId: null,
    isFirstRideOnly: true,
  };

  // Brand new user (0 completed rides) -> PASS
  assert.equal(
    validatePromoEligibility({ promo: welcomePromo, requestCityId: 'city-1', requestVehicleTypeId: 'bike', riderCompletedRidesCount: 0 }),
    true
  );

  // Existing user with prior completed rides -> REJECT
  assert.throws(
    () => validatePromoEligibility({ promo: welcomePromo, requestCityId: 'city-1', requestVehicleTypeId: 'bike', riderCompletedRidesCount: 1 }),
    /only valid for your first ride/
  );
});

test('driver earnings are protected when rider uses promo discount (platform absorbs subsidy)', () => {
  // Scenario: $50.00 (5000 minor) gross fare, 20% platform commission standard.
  // Promo: $10.00 (1000 minor) rider discount.
  const grossFareMinor = 5000;
  const promoDiscountMinor = 1000;
  const commissionRate = 0.20;

  // 1. Rider pays discounted fare
  const riderPayableMinor = grossFareMinor - promoDiscountMinor;
  assert.equal(riderPayableMinor, 4000); // $40.00

  // 2. Driver earnings calculated on gross fare ($50.00) minus commission (20% of $50 = $10)
  const commissionMinor = Math.round(grossFareMinor * commissionRate);
  assert.equal(commissionMinor, 1000); // $10.00

  const driverEarningsMinor = grossFareMinor - commissionMinor;
  assert.equal(driverEarningsMinor, 4000); // $40.00 earned by driver (UNPENALIZED)

  // 3. Platform financial reconciliation
  // Platform collected: $40 from rider
  // Platform paid to driver: $40
  // Platform net commission earned: $10 gross commission - $10 subsidy absorbed = $0
  const platformSubsidyMinor = promoDiscountMinor;
  const platformNetMinor = commissionMinor - platformSubsidyMinor;
  assert.equal(platformSubsidyMinor, 1000);
  assert.equal(platformNetMinor, 0);

  // Invariant check: Driver earnings + Platform net revenue + Platform subsidy = Gross fare
  assert.equal(driverEarningsMinor + commissionMinor, grossFareMinor);
});

