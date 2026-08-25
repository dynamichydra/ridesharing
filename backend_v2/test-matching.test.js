import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  scoreDrivers,
  calculateDirectionAlignment,
  calculateIdleScore,
  DEFAULT_WEIGHTS,
} from './src/modules/matching/scoring.service.js';

import {
  calculateHaversineDistanceKm,
  calculateEstimatedEta,
} from './src/modules/matching/eta.service.js';

import {
  validateLocationFreshness,
  EXCLUSION_REASONS,
} from './src/modules/matching/candidate-filter.service.js';

describe('Driver Matching Service Unit Tests', () => {

  describe('1. ETA & Distance Calculations', () => {
    it('should compute Haversine distance between two points', () => {
      // Kolkata Park Street (22.5535, 88.3516) to Howrah Station (22.5839, 88.3426) ~ 3.5 km
      const distance = calculateHaversineDistanceKm(22.5535, 88.3516, 22.5839, 88.3426);
      assert.ok(distance > 3.0 && distance < 4.5, `Distance was ${distance}`);
    });

    it('should calculate estimated road ETA with urban detour factor', () => {
      const eta = calculateEstimatedEta(22.5535, 88.3516, 22.5839, 88.3426);
      assert.ok(eta.distanceKm > 0);
      assert.ok(eta.etaMin > 0);
      assert.ok(eta.etaSeconds >= 60);
      assert.strictEqual(eta.source, 'fallback_estimate');
    });
  });

  describe('2. Location Freshness & Quality Rating', () => {
    it('should rate recent location as excellent', () => {
      const driver = { updatedAt: new Date(Date.now() - 3000) }; // 3s ago
      const result = validateLocationFreshness(driver, 60);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.quality, 'excellent');
    });

    it('should rate 20s old location as acceptable', () => {
      const driver = { updatedAt: new Date(Date.now() - 20000) }; // 20s ago
      const result = validateLocationFreshness(driver, 60);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.quality, 'acceptable');
    });

    it('should reject stale location older than maxAge', () => {
      const driver = { updatedAt: new Date(Date.now() - 75000) }; // 75s ago
      const result = validateLocationFreshness(driver, 60);
      assert.strictEqual(result.valid, false);
      assert.strictEqual(result.quality, 'unavailable');
      assert.ok(result.reason.includes('exceeds limit'));
    });
  });

  describe('3. Direction Alignment Scoring', () => {
    it('should score 1.0 when driver heading directly toward pickup', () => {
      // Driver at (0, 0), Pickup at (0, 1) -> Bearing is 90 deg (East)
      // If driver heading is 90 deg -> perfect alignment
      const score = calculateDirectionAlignment(0, 0, 90, 0, 1);
      assert.ok(score >= 0.95, `Expected score ~1.0, got ${score}`);
    });

    it('should score near 0.0 when driver heading away from pickup', () => {
      // Bearing is 90 deg (East), driver heading is 270 deg (West)
      const score = calculateDirectionAlignment(0, 0, 270, 0, 1);
      assert.ok(score <= 0.05, `Expected score ~0.0, got ${score}`);
    });

    it('should return neutral 0.5 when heading is null/unknown', () => {
      const score = calculateDirectionAlignment(0, 0, null, 0, 1);
      assert.strictEqual(score, 0.5);
    });
  });

  describe('4. Idle Time Scoring (Fairness)', () => {
    it('should score higher for drivers waiting longer', () => {
      const shortIdle = calculateIdleScore(new Date(Date.now() - 5 * 60 * 1000)); // 5 mins
      const longIdle = calculateIdleScore(new Date(Date.now() - 45 * 60 * 1000)); // 45 mins

      assert.ok(longIdle > shortIdle, `Expected ${longIdle} > ${shortIdle}`);
    });
  });

  describe('5. Multi-Factor Scoring & Ranking Engine', () => {
    it('should prioritize closer ETA, higher rating, and fairness', () => {
      const candidates = [
        {
          id: 'driver-a',
          name: 'Driver A (Far, High Rating)',
          etaMin: 12.0,
          distance_km: 8.0,
          rating: 4.9,
          acceptanceRate: 0.95,
          lastTripEndedAt: new Date(Date.now() - 10 * 60 * 1000),
        },
        {
          id: 'driver-b',
          name: 'Driver B (Very Close, Good Rating)',
          etaMin: 2.5,
          distance_km: 1.2,
          rating: 4.8,
          acceptanceRate: 0.90,
          lastTripEndedAt: new Date(Date.now() - 30 * 60 * 1000),
        },
        {
          id: 'driver-c',
          name: 'Driver C (Medium, Low Acceptance)',
          etaMin: 5.0,
          distance_km: 3.0,
          rating: 4.2,
          acceptanceRate: 0.40,
          lastTripEndedAt: new Date(Date.now() - 2 * 60 * 1000),
        },
      ];

      const scored = scoreDrivers(candidates, DEFAULT_WEIGHTS);

      assert.strictEqual(scored[0].id, 'driver-b', 'Driver B should win rank 1 due to low ETA and high idle fairness');
      assert.ok(scored[0]._score > scored[1]._score);
      assert.ok(scored[0].scoreBreakdown != null);
      assert.ok(scored[0].scoreBreakdown.etaScore > 0);
    });

    it('should apply priority matching subscription perk boost', () => {
      const normalDriver = {
        id: 'driver-1',
        etaMin: 5.0,
        distance_km: 3.0,
        rating: 4.8,
        priorityMatching: false,
      };
      const priorityDriver = {
        id: 'driver-2',
        etaMin: 5.0,
        distance_km: 3.0,
        rating: 4.8,
        priorityMatching: true,
      };

      const [winner] = scoreDrivers([normalDriver, priorityDriver], DEFAULT_WEIGHTS);
      assert.strictEqual(winner.id, 'driver-2', 'Priority subscription driver should rank higher on equal stats');
    });
  });
});
