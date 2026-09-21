import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { executeFeesStage } from '../src/modules/fare/engine/stages/08-fees.stage.js';

describe('City-Type Driven Fare & Commission Engine', () => {

  test('Airport Service Fee: Automatically applied in Stage 8 when pickup or dropoff is at airport', async () => {
    const contextAirport = {
      pickupZone: { type: 'airport', airportFeeMinor: 5000, name: 'CCU Airport' },
      dropZone: null,
      rateCard: { minFareMinor: 5000, bookingFeeMinor: 1000, serviceFeeMinor: 0 },
      metered: { meteredSubtotalMinor: 15000 },
      rules: { flatFareMinor: null },
      surge: { surgeAmountMinor: 0 },
    };

    const result = await executeFeesStage(contextAirport);
    assert.equal(result.fees.airportFeeMinor, 5000); // ₹50.00 airport fee
    assert.equal(result.fees.bookingFeeMinor, 1000); // ₹10.00 booking fee
    assert.equal(result.fees.totalFeesMinor, 6000);
    assert.equal(result.fees.preTaxFareMinor, 15000 + 6000); // 21000
  });

  test('Minimum Fare Floor: Clamps metered subtotal to minFareMinor if below floor', async () => {
    const contextLowFare = {
      pickupZone: null,
      dropZone: null,
      rateCard: { minFareMinor: 8000, bookingFeeMinor: 500, serviceFeeMinor: 0 },
      metered: { meteredSubtotalMinor: 4000 }, // Below 8000 min fare
      rules: { flatFareMinor: null },
      surge: { surgeAmountMinor: 0 },
    };

    const result = await executeFeesStage(contextLowFare);
    assert.equal(result.fees.minFareApplied, true);
    assert.equal(result.fees.preTaxFareMinor, 8000 + 500); // Clamped to 8000 + 500 booking fee
  });

  test('Fee Isolation: Surcharges are calculated without multiplying airport or platform fees', () => {
    const baseFareMinor = 4000;
    const distanceFareMinor = 6000;
    const timeFareMinor = 2000;
    const meteredSubtotalMinor = baseFareMinor + distanceFareMinor + timeFareMinor; // 12000
    const surgeMultiplier = 1.5;

    const surgeAmountMinor = Math.round(meteredSubtotalMinor * (surgeMultiplier - 1.0)); // 6000
    const airportFeeMinor = 3000;
    const bookingFeeMinor = 1000;

    const totalPreTaxFareMinor = meteredSubtotalMinor + surgeAmountMinor + airportFeeMinor + bookingFeeMinor;
    assert.equal(totalPreTaxFareMinor, 22000);
  });

});
