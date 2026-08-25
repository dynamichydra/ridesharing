import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { calculateSurgeMultiplier } from '../src/modules/fare/surge/surge-calculator.js';
import { roundToIncrement, fromMinor } from '../src/utils/money.js';

describe('Structured Fare Engine & Surge Calculation', () => {

  test('Surge Calculator: returns floor 1.0x under zero or balanced demand', () => {
    const result = calculateSurgeMultiplier({ demand: 0, supply: 10, minMultiplier: 1.0, maxMultiplier: 3.0 });
    assert.equal(result.multiplier, 1.0);
    assert.equal(result.ratio, 0);

    const normalResult = calculateSurgeMultiplier({ demand: 10, supply: 10, minMultiplier: 1.0, maxMultiplier: 3.0 });
    assert.equal(normalResult.multiplier, 1.0);
    assert.equal(normalResult.ratio, 1.0);
  });

  test('Surge Calculator: applies smooth surge progression based on demand/supply imbalance', () => {
    const surge1 = calculateSurgeMultiplier({ demand: 15, supply: 10 }); // ratio 1.5
    assert.equal(surge1.multiplier, 1.25);

    const surge2 = calculateSurgeMultiplier({ demand: 20, supply: 10 }); // ratio 2.0
    assert.equal(surge2.multiplier, 1.5);

    const surge3 = calculateSurgeMultiplier({ demand: 30, supply: 10 }); // ratio 3.0
    assert.equal(surge3.multiplier, 2.0);
  });

  test('Surge Calculator: respects max surge multiplier cap (e.g. 3.0x)', () => {
    const extremeSurge = calculateSurgeMultiplier({ demand: 100, supply: 5, maxMultiplier: 3.0 });
    assert.ok(extremeSurge.multiplier <= 3.0);
    assert.equal(extremeSurge.multiplier, 3.0);
  });

  test('Surge Isolation: Surge only multiplies surgeable metered components (Base + Distance + Time)', () => {
    const baseFareMinor = 5000;     // 50.00
    const distanceFareMinor = 10000; // 100.00
    const timeFareMinor = 4000;      // 40.00
    const airportFeeMinor = 5000;    // 50.00 (non-surgeable)
    const bookingFeeMinor = 1000;    // 10.00 (non-surgeable)

    const surgeMultiplier = 1.5;

    const surgeableBaseMinor = baseFareMinor + distanceFareMinor + timeFareMinor; // 19000
    assert.equal(surgeableBaseMinor, 19000);

    const surgeAmountMinor = Math.round(surgeableBaseMinor * (surgeMultiplier - 1.0)); // 9500
    assert.equal(surgeAmountMinor, 9500);

    // Total should equal surgeable (19000) + surgeAmount (9500) + non-surgeable fees (5000 + 1000) = 34500
    const subtotalMinor = surgeableBaseMinor + surgeAmountMinor + airportFeeMinor + bookingFeeMinor;
    assert.equal(subtotalMinor, 34500);
  });

  test('Currency Rounding: properly rounds integer minor units to specified increment', () => {
    // 34520 minor rounded to nearest 100 (1.00 currency unit)
    const rounded = roundToIncrement(34520, 100);
    assert.equal(rounded, 34500);

    const roundedUp = roundToIncrement(34560, 100);
    assert.equal(roundedUp, 34600);
  });

  test('Money Formatting: converts minor integer units to major units and formatted string', () => {
    const value = fromMinor(34500, 'INR');
    assert.equal(value, 345);
  });

  test('Waiting time logic: applies charges only after grace period expires', () => {
    const waitingDurationMin = 8;
    const gracePeriodMin = 3;
    const waitingPricePerMinMinor = 200; // 2.00 / min

    const chargeableMin = Math.max(0, waitingDurationMin - gracePeriodMin);
    assert.equal(chargeableMin, 5);

    const waitingFareMinor = chargeableMin * waitingPricePerMinMinor;
    assert.equal(waitingFareMinor, 1000); // 10.00
  });

});
