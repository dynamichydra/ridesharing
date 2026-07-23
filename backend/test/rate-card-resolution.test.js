import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickResolvedTier } from '../src/modules/vehicle-type/rate-card-resolution.js';

// resolveRateCard()'s fallback order — exact (vehicleType+country+fuelType) →
// category (vehicleType+country, fuelType null) → global default country.
// The DB-touching wrapper fetches each tier's row (or null) and hands them
// here to decide which one wins; this pure function is what's tested.

test('picks the exact tier when a fuelType was requested and an exact row exists', () => {
  const exact = { id: 'exact-row' };
  const category = { id: 'category-row' };
  const global = { id: 'global-row' };
  const resolved = pickResolvedTier('electric', { exact, category, global });
  assert.equal(resolved.id, 'exact-row');
  assert.equal(resolved.resolutionTier, 'exact');
});

test('falls back to category when no fuelType was requested, even if an exact row exists', () => {
  // fuelType=null means the caller never asked for the fuel-specific tier —
  // calculateFare()'s current call site always does this today.
  const exact = { id: 'exact-row' };
  const category = { id: 'category-row' };
  const resolved = pickResolvedTier(null, { exact, category, global: null });
  assert.equal(resolved.id, 'category-row');
  assert.equal(resolved.resolutionTier, 'category');
});

test('falls back to category when fuelType was requested but no exact row exists', () => {
  const category = { id: 'category-row' };
  const resolved = pickResolvedTier('diesel', { exact: null, category, global: { id: 'global-row' } });
  assert.equal(resolved.id, 'category-row');
  assert.equal(resolved.resolutionTier, 'category');
});

test('falls back to global default when neither exact nor category rows exist', () => {
  const global = { id: 'global-row' };
  const resolved = pickResolvedTier('cng', { exact: null, category: null, global });
  assert.equal(resolved.id, 'global-row');
  assert.equal(resolved.resolutionTier, 'global');
});

test('returns null when no tier has a row (caller throws its own 404)', () => {
  const resolved = pickResolvedTier(null, { exact: null, category: null, global: null });
  assert.equal(resolved, null);
});
