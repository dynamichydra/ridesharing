import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as enums from '../drizzle/schema/enums.js';

test('exports all expected schema enums', () => {
  assert.ok(enums.rideStatusEnum);
  assert.ok(enums.userStatusEnum);
  assert.ok(enums.driverStatusEnum);
  assert.ok(enums.fareSplitStatusEnum);
  assert.ok(enums.fareSplitPaymentStatusEnum);
  assert.ok(enums.referralStatusEnum);
  assert.ok(enums.sosAlertStatusEnum);
  assert.ok(enums.contentFlagStatusEnum);
  assert.ok(enums.savedPlaceLabelEnum);
});

test('rideStatusEnum contains all valid ride statuses', () => {
  const values = enums.rideStatusEnum.enumValues;
  assert.deepEqual(values, [
    'scheduled', 'requested', 'searching', 'accepted', 'arriving', 'arrived', 'started', 'completed', 'cancelled', 'expired',
  ]);
});

test('userStatusEnum contains active and suspended statuses', () => {
  const values = enums.userStatusEnum.enumValues;
  assert.deepEqual(values, ['pending', 'active', 'suspended', 'deleted']);
});

test('savedPlaceLabelEnum contains home, work, favorite, custom', () => {
  const values = enums.savedPlaceLabelEnum.enumValues;
  assert.deepEqual(values, ['home', 'work', 'favorite', 'custom']);
});
