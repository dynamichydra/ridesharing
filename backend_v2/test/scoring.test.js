import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreDrivers, DEFAULT_WEIGHTS } from '../src/modules/matching/scoring.service.js';

test('scoreDrivers ranks a closer, better-rated, more-reliable driver higher', () => {
  const candidates = [
    { id: 'far', etaMin: 20, rating: '4.2', acceptanceRate: 0.5 },
    { id: 'near', etaMin: 3, rating: '4.9', acceptanceRate: 0.95 },
  ];
  const scored = scoreDrivers(candidates);
  assert.equal(scored[0].id, 'near');
  assert.ok(scored[0]._score > scored[1]._score);
});

test('scoreDrivers respects custom weights over defaults', () => {
  const candidates = [
    { id: 'high-rating-far', etaMin: 30, rating: '5.0', acceptanceRate: 0.5 },
    { id: 'low-rating-near', etaMin: 2, rating: '3.0', acceptanceRate: 0.5 },
  ];
  // Weighting rating heavily should flip the default (distance-heavy) ranking.
  const scored = scoreDrivers(candidates, { distanceWeight: 0.01, ratingWeight: 0.99, acceptanceRateWeight: 0 });
  assert.equal(scored[0].id, 'high-rating-far');
});

test('scoreDrivers falls back to distance_km/distanceKm when etaMin is absent', () => {
  const candidates = [
    { id: 'a', distance_km: '10', rating: '5', acceptanceRate: 0.8 },
    { id: 'b', distanceKm: '1', rating: '5', acceptanceRate: 0.8 },
  ];
  const scored = scoreDrivers(candidates);
  assert.equal(scored[0].id, 'b');
});

test('scoreDrivers guards against a zero/near-zero eta dividing by zero', () => {
  const candidates = [{ id: 'a', etaMin: 0, rating: '5', acceptanceRate: 0.8 }];
  const scored = scoreDrivers(candidates);
  assert.ok(Number.isFinite(scored[0]._score));
});

test('DEFAULT_WEIGHTS sums to 1 (sane default configuration)', () => {
  const sum = DEFAULT_WEIGHTS.distanceWeight + DEFAULT_WEIGHTS.ratingWeight + DEFAULT_WEIGHTS.acceptanceRateWeight;
  assert.equal(Math.round(sum * 100) / 100, 1);
});
