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
