import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldFlagDeviation, DEVIATION_THRESHOLD_PCT } from '../src/modules/trip-gps/deviation-policy.js';

test('does not flag when actual fare is within tolerance of the estimate', () => {
  const { flagged, deviationPct } = shouldFlagDeviation(10000, 11000); // +10%
  assert.equal(flagged, false);
  assert.equal(deviationPct, 10);
});

test('does not flag when actual fare is lower than the estimate', () => {
  const { flagged, deviationPct } = shouldFlagDeviation(10000, 8000); // -20%
  assert.equal(flagged, false);
  assert.equal(deviationPct, -20);
});

test('flags when actual fare exceeds the estimate by more than the threshold', () => {
  const { flagged, deviationPct } = shouldFlagDeviation(10000, 13000); // +30%
  assert.equal(flagged, true);
  assert.equal(deviationPct, 30);
});

test('is not flagged exactly at the threshold boundary (strictly greater-than)', () => {
  const exactlyAtThreshold = 10000 * (1 + DEVIATION_THRESHOLD_PCT / 100);
  const { flagged } = shouldFlagDeviation(10000, exactlyAtThreshold);
  assert.equal(flagged, false);
});

test('is flagged just over the threshold boundary', () => {
  const justOver = 10000 * (1 + DEVIATION_THRESHOLD_PCT / 100) + 1;
  const { flagged } = shouldFlagDeviation(10000, justOver);
  assert.equal(flagged, true);
});

test('a custom threshold overrides the default', () => {
  const { flagged } = shouldFlagDeviation(10000, 10500, 5); // +5% with a 5% threshold
  assert.equal(flagged, false); // exactly at threshold, not over
  const { flagged: flaggedOver } = shouldFlagDeviation(10000, 10600, 5); // +6%
  assert.equal(flaggedOver, true);
});

test('handles a zero estimate without dividing by zero', () => {
  const { flagged, deviationPct } = shouldFlagDeviation(0, 500);
  assert.equal(deviationPct, 0);
  assert.equal(flagged, false);
});
