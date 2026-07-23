import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REDIS_KEYS } from '../src/config/redis.js';

test('driverOfferLock key is unique per driver', () => {
  assert.equal(REDIS_KEYS.driverOfferLock('d1'), 'driver:lock:d1');
  assert.notEqual(REDIS_KEYS.driverOfferLock('d1'), REDIS_KEYS.driverOfferLock('d2'));
});

test('driverHexIndex key is unique per resolution+cell pair', () => {
  assert.equal(REDIS_KEYS.driverHexIndex(6, 'abc123'), 'driver:hex:6:abc123');
  assert.notEqual(REDIS_KEYS.driverHexIndex(6, 'abc123'), REDIS_KEYS.driverHexIndex(7, 'abc123'));
  assert.notEqual(REDIS_KEYS.driverHexIndex(6, 'abc123'), REDIS_KEYS.driverHexIndex(6, 'def456'));
});

test('driverHexCurrent key is unique per driver', () => {
  assert.equal(REDIS_KEYS.driverHexCurrent('d1'), 'driver:hex:current:d1');
});

test('driverAcceptanceRate key is unique per driver', () => {
  assert.equal(REDIS_KEYS.driverAcceptanceRate('d1'), 'driver:acceptrate:d1');
  assert.notEqual(REDIS_KEYS.driverAcceptanceRate('d1'), REDIS_KEYS.driverAcceptanceRate('d2'));
});

test('gpsPingBuffer key is unique per ride', () => {
  assert.equal(REDIS_KEYS.gpsPingBuffer('r1'), 'ride:gps:buffer:r1');
  assert.notEqual(REDIS_KEYS.gpsPingBuffer('r1'), REDIS_KEYS.gpsPingBuffer('r2'));
});

test('CHAN.rideAccepted key is unique per ride', () => {
  assert.equal(REDIS_KEYS.CHAN.rideAccepted('r1'), 'chan:ride:accepted:r1');
});
