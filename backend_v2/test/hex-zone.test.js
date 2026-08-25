import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortZonesByPrecedence } from '../src/modules/zone/hex-zone.service.js';

// Overlap/precedence: a coordinate inside an airport zone that itself sits inside a city-wide
// surge zone should resolve with the airport (more specific, higher priority) first.
test('sortZonesByPrecedence orders the more specific (higher-priority) zone first', () => {
  const citySurge = { id: 'city', name: 'City Surge', priority: 10 };
  const airport    = { id: 'airport', name: 'Airport Zone', priority: 100 };
  const restricted = { id: 'restricted', name: 'Restricted Zone', priority: 50 };

  const sorted = sortZonesByPrecedence([citySurge, restricted, airport]);

  assert.deepEqual(sorted.map((z) => z.id), ['airport', 'restricted', 'city']);
});

test('sortZonesByPrecedence treats a missing priority as the default (1)', () => {
  const noPriority = { id: 'legacy', name: 'Legacy Zone' };
  const explicit    = { id: 'new', name: 'New Zone', priority: 5 };

  const sorted = sortZonesByPrecedence([noPriority, explicit]);

  assert.deepEqual(sorted.map((z) => z.id), ['new', 'legacy']);
});

test('sortZonesByPrecedence on an empty list returns an empty list (no-zone-match fallback shape)', () => {
  assert.deepEqual(sortZonesByPrecedence([]), []);
});

test('sortZonesByPrecedence does not mutate the input array', () => {
  const input = [{ id: 'a', priority: 1 }, { id: 'b', priority: 5 }];
  const inputCopy = [...input];
  sortZonesByPrecedence(input);
  assert.deepEqual(input, inputCopy);
});
