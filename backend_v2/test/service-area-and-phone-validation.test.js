import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLocationInServiceArea } from '../src/modules/zone/zone.service.js';
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
