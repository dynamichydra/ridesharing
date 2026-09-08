import 'dotenv/config';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getFxRate, setFxRate, convertMoneyWithRate } from '../src/modules/fx/fx.service.js';

describe('Production FX Service Verification', () => {

  test('Identity Rate: Same base and quote currency returns 1.0 immediately', async () => {
    const usdRate = await getFxRate('USD', 'USD');
    const inrRate = await getFxRate('INR', 'INR');
    const cadRate = await getFxRate('CAD', 'CAD');
    assert.equal(usdRate, 1.0);
    assert.equal(inrRate, 1.0);
    assert.equal(cadRate, 1.0);
  });

  test('Dynamic DB/Cache Rate: setFxRate inserts rate and getFxRate retrieves direct and inverse accurately', async () => {
    // Insert USD -> INR = 84.0
    await setFxRate('USD', 'INR', 84.0, 'test-suite');

    const directRate = await getFxRate('USD', 'INR');
    assert.equal(directRate, 84.0);

    // Inverse query: INR -> USD should be 1 / 84.0
    const inverseRate = await getFxRate('INR', 'USD');
    assert.ok(Math.abs(inverseRate - (1.0 / 84.0)) < 0.0001, 'Inverse rate must equal 1 / direct');
  });

  test('Error Boundary: Throws 422 UNSUPPORTED_FX_PAIR when pair is not found', async () => {
    await assert.rejects(
      async () => {
        await getFxRate('NON_EXISTENT_CURRENCY_A', 'NON_EXISTENT_CURRENCY_B');
      },
      (err) => {
        assert.equal(err.statusCode, 422);
        assert.equal(err.code, 'UNSUPPORTED_FX_PAIR');
        return true;
      }
    );
  });

  test('Minor-Unit Conversion Arithmetic: Handles multi-exponent conversions safely', () => {
    // 50.00 USD (5000 cents) -> INR at 84.0 = 4,200.00 INR (420000 paise)
    const inrMinor = convertMoneyWithRate(5000, 84.0, 2, 2);
    assert.equal(inrMinor, 420000);

    // 100.00 USD (10000 cents) -> JPY (0 decimals) at 155.0 = 15500 JPY
    const jpyMinor = convertMoneyWithRate(10000, 155.0, 2, 0);
    assert.equal(jpyMinor, 15500);

    // 1000 JPY (1000 minor, 0 decimals) -> USD (2 decimals) at 0.00645 = 645 cents ($6.45)
    const usdMinor = convertMoneyWithRate(1000, 0.00645, 0, 2);
    assert.equal(usdMinor, 645);
  });

});
