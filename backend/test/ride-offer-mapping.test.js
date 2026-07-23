import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toOfferPayload } from '../src/modules/matching/matching.service.js';

// Regression test for the pre-existing bug: candidates carry raw SQL-row field
// names (`.id`, `.distance_km`), but ride_offer.service.js's createOffersForRing
// reads camelCase `driverId`/`distanceKm`. Previously the DB-insert call site
// wasn't remapped at all, so `distanceKm: String(undefined)` — the literal
// string "undefined" — was rejected by the decimal column and every
// ride_offers insert silently failed. toOfferPayload() is now the single
// shared mapping feeding both the DB insert and the Kafka broadcast.

test('toOfferPayload maps raw SQL-row candidates to the shape createOffersForRing expects', () => {
  const candidates = [{
    id: 'driver-1', name: 'Asha', rating: '4.80', distance_km: '2.150',
    vehicleNumber: 'KA01AB1234', fcmToken: 'tok-1', _score: 0.9123,
  }];

  const [payload] = toOfferPayload(candidates);

  assert.equal(payload.driverId, 'driver-1');
  assert.equal(payload.distanceKm, '2.150');
  assert.equal(payload.rating, '4.80');
  assert.equal(payload.score, 0.9123);
  assert.equal(payload.vehicleNumber, 'KA01AB1234');
  assert.equal(payload.fcmToken, 'tok-1');
});

test('toOfferPayload never produces the literal string "undefined" for distanceKm', () => {
  const candidates = [{ id: 'driver-2', name: 'Ravi', rating: '5.00', distance_km: '0.500', _score: 1.2 }];
  const [payload] = toOfferPayload(candidates);
  assert.notEqual(String(payload.distanceKm), 'undefined');
  assert.notEqual(String(payload.driverId), 'undefined');
});

test('toOfferPayload preserves order and handles multiple candidates', () => {
  const candidates = [
    { id: 'a', name: 'A', rating: '4.5', distance_km: '1.0', _score: 0.5 },
    { id: 'b', name: 'B', rating: '4.9', distance_km: '3.0', _score: 0.8 },
  ];
  const payload = toOfferPayload(candidates);
  assert.deepEqual(payload.map((p) => p.driverId), ['a', 'b']);
});
