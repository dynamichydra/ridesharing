import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXCLUSION_REASONS, validateLocationFreshness } from '../src/modules/matching/candidate-filter.service.js';
import { driverRiderBlocks } from '../drizzle/schema/index.js';

test('Driver-Rider Block & Candidate Filter Verification', async () => {
  assert.equal(EXCLUSION_REASONS.RISK_BLOCKED, 'RISK_BLOCKED');
  assert.ok(driverRiderBlocks, 'driverRiderBlocks table export exists in schema');

  // Test GPS freshness validator
  const freshDriver = { id: 'd1', lastSeenAt: new Date(Date.now() - 10000) };
  const freshResult = validateLocationFreshness(freshDriver, 900);
  assert.equal(freshResult.valid, true);

  const staleDriver = { id: 'd2', lastSeenAt: new Date(Date.now() - 1000000) };
  const staleResult = validateLocationFreshness(staleDriver, 900);
  assert.equal(staleResult.valid, false);
});
