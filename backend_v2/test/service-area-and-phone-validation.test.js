import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocationInServiceArea, validateZoneInsideServiceArea } from '../src/modules/zone/zone.service.js';
import { executeSurgeStage } from '../src/modules/fare/engine/stages/07-surge.stage.js';
import { validateDriverPhoneCountryMatch } from '../src/modules/auth/auth.service.js';

test('Service Area Validation — Coordinates Evaluation', async () => {
  // Invalid coordinates
  const invalid = await isLocationInServiceArea(null, null);
  assert.equal(invalid.inServiceArea, false);
  assert.equal(invalid.reason, 'INVALID_COORDINATES');

  const nanCheck = await isLocationInServiceArea('abc', 'def');
  assert.equal(nanCheck.inServiceArea, false);
  assert.equal(nanCheck.reason, 'INVALID_COORDINATES');
});

test('Zone Containment Validation — Zones Must Belong to City with Active Service Area', async () => {
  // 1. Missing cityId
  await assert.rejects(
    async () => {
      await validateZoneInsideServiceArea({ type: 'Polygon', coordinates: [[[77.5, 12.9], [77.6, 12.9], [77.6, 13.0], [77.5, 12.9]]] }, null);
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /cityId is required/i);
      return true;
    }
  );

  // 2. City with no active service area in DB
  const randomCityId = '00000000-0000-0000-0000-000000000001';
  await assert.rejects(
    async () => {
      await validateZoneInsideServiceArea(
        { type: 'Polygon', coordinates: [[[77.5, 12.9], [77.6, 12.9], [77.6, 13.0], [77.5, 12.9]]] },
        randomCityId
      );
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'NO_ACTIVE_SERVICE_AREA');
      return true;
    }
  );
});

test('Fare Multiplier Resolution — Zone Null Defaults to City Type Cost Index', async () => {
  // When pickupZone is null, baseline multiplier should depend on cityType costIndex (e.g. 1.40 for Metro)
  const contextMetro = {
    request: { pickupLat: '12.9716', pickupLng: '77.5946' },
    pickupZone: null,
    route: { trafficDelayS: 0 },
    rateCard: { surgeFloorMultiplier: '1.0', surgeCapMultiplier: '3.0' },
    metered: { meteredSubtotalMinor: 10000 },
    rules: { ruleMultiplier: 1.0, flatFareMinor: null },
    cityType: { costIndex: '1.40', code: 'TIER_1_METRO' },
  };

  const resultMetro = await executeSurgeStage(contextMetro);
  assert.equal(resultMetro.surge.zoneMultiplier, 1.4);
  assert.equal(resultMetro.surge.baselineMultiplier, 1.4);
  assert.equal(resultMetro.surge.surgeMultiplier, parseFloat((resultMetro.surge.dynamicSurgeMultiplier * 1.4).toFixed(4)));

  // When pickupZone has a special zone multiplier (e.g. Airport 1.25x), it overrides cityType
  const contextAirport = {
    request: { pickupLat: '12.9716', pickupLng: '77.5946' },
    pickupZone: { id: 'zone-airport', name: 'Intl Airport', multiplier: '1.25' },
    route: { trafficDelayS: 0 },
    rateCard: { surgeFloorMultiplier: '1.0', surgeCapMultiplier: '3.0' },
    metered: { meteredSubtotalMinor: 10000 },
    rules: { ruleMultiplier: 1.0, flatFareMinor: null },
    cityType: { costIndex: '1.40', code: 'TIER_1_METRO' },
  };

  const resultAirport = await executeSurgeStage(contextAirport);
  assert.equal(resultAirport.surge.zoneMultiplier, 1.25);
  assert.equal(resultAirport.surge.baselineMultiplier, 1.25);
  assert.equal(resultAirport.surge.surgeMultiplier, parseFloat((resultAirport.surge.dynamicSurgeMultiplier * 1.25).toFixed(4)));

  // When pickupZone is null and city has no specific cityType, defaults to 1.00
  const contextDefault = {
    request: { pickupLat: '12.9716', pickupLng: '77.5946' },
    pickupZone: null,
    route: { trafficDelayS: 0 },
    rateCard: { surgeFloorMultiplier: '1.0', surgeCapMultiplier: '3.0' },
    metered: { meteredSubtotalMinor: 10000 },
    rules: { ruleMultiplier: 1.0, flatFareMinor: null },
    cityType: null,
  };

  const resultDefault = await executeSurgeStage(contextDefault);
  assert.equal(resultDefault.surge.zoneMultiplier, 1.0);
  assert.equal(resultDefault.surge.baselineMultiplier, 1.0);
  assert.equal(resultDefault.surge.surgeMultiplier, parseFloat((resultDefault.surge.dynamicSurgeMultiplier * 1.0).toFixed(4)));
});

test('Driver Phone Country Validation — Canadian Drivers Cannot Register with Indian (+91) Numbers', async () => {
  // Canadian driver attempt with +91
  await assert.rejects(
    async () => {
      await validateDriverPhoneCountryMatch('+919876543210', 'CA');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'PHONE_COUNTRY_MISMATCH');
      assert.match(err.message, /Canadian drivers cannot register with an Indian phone number/i);
      return true;
    }
  );

  // Canadian driver attempt with raw 91 Indian number
  await assert.rejects(
    async () => {
      await validateDriverPhoneCountryMatch('919876543210', 'CA');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'PHONE_COUNTRY_MISMATCH');
      return true;
    }
  );
});

test('Driver Phone Country Validation — Indian Drivers Cannot Register with Canadian/US (+1) Numbers', async () => {
  // Indian driver attempt with +1
  await assert.rejects(
    async () => {
      await validateDriverPhoneCountryMatch('+14165551234', 'IN');
    },
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'PHONE_COUNTRY_MISMATCH');
      assert.match(err.message, /Indian drivers cannot register with a Canadian/i);
      return true;
    }
  );
});

test('Driver Phone Country Validation — Valid Registrations Pass', async () => {
  // Indian driver with valid Indian number
  await assert.doesNotReject(async () => {
    await validateDriverPhoneCountryMatch('+919876543210', 'IN');
  });

  // Canadian driver with valid Canadian number
  await assert.doesNotReject(async () => {
    await validateDriverPhoneCountryMatch('+14165551234', 'CA');
  });
});
