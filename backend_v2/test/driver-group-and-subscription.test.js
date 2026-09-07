import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  driverGroups,
  driverGroupMembers,
  planGroupPricing,
  subscriptionPlans,
} from '../drizzle/schema/index.js';
import { normalizePlanPayload } from '../src/modules/subscription/plan-validation.js';
import { scoreDrivers } from '../src/modules/matching/scoring.service.js';
import { resolvePlanPricingForDriver } from '../src/modules/subscription/subscription.service.js';

test('1. Schema exports for Driver Groups & Group Pricing', () => {
  assert.ok(driverGroups, 'driverGroups table is exported');
  assert.ok(driverGroupMembers, 'driverGroupMembers table is exported');
  assert.ok(planGroupPricing, 'planGroupPricing table is exported');
  assert.ok(subscriptionPlans.entitlements, 'subscriptionPlans has entitlements column');
  assert.ok(subscriptionPlans.allowedGroupIds, 'subscriptionPlans has allowedGroupIds column');
});

test('2. Plan Validation — Entitlements & Allowed Groups', async () => {
  // Valid payload
  const valid = await normalizePlanPayload({
    name: 'VIP Platinum',
    entitlements: {
      commissionRate: 0.05,
      priorityScoreBonus: 0.25,
      maxRidesPerDay: 50,
      freeInstantPayouts: true,
    },
    features: ['5% Commission', 'Priority Matching Boost'],
    priorityMatching: true,
  });

  assert.equal(valid.entitlements.commissionRate, 0.05);
  assert.equal(valid.entitlements.priorityScoreBonus, 0.25);
  assert.equal(valid.entitlements.maxRidesPerDay, 50);
  assert.equal(valid.entitlements.freeInstantPayouts, true);

  // Invalid commissionRate (out of 0-1 range)
  await assert.rejects(
    normalizePlanPayload({
      entitlements: { commissionRate: 1.5 },
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /commissionRate/);
      return true;
    }
  );

  // Invalid priorityScoreBonus (negative)
  await assert.rejects(
    normalizePlanPayload({
      entitlements: { priorityScoreBonus: -0.1 },
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /priorityScoreBonus/);
      return true;
    }
  );

  // Invalid allowedGroupIds (non-uuid)
  await assert.rejects(
    normalizePlanPayload({
      allowedGroupIds: ['not-a-uuid'],
    }),
    (err) => {
      assert.equal(err.statusCode, 400);
      assert.match(err.message, /allowedGroupIds/);
      return true;
    }
  );
});

test('3. Dynamic Matching Scoring — Plan Entitlement Priority Bonus', () => {
  const baseCandidate = {
    id: 'driver_test_1',
    distanceKm: 2.0,
    etaMin: 5.0,
    rating: 4.8,
    acceptanceRate: 0.95,
    cancellationRate: 0.02,
    currentLat: '12.9716',
    currentLng: '77.5946',
  };

  // 1. Candidate with standard priorityMatching = true (0.15 default bonus)
  const scoredStandard = scoreDrivers(
    [{ ...baseCandidate, priorityMatching: true }],
    12.975,
    77.598
  );
  assert.equal(scoredStandard[0].scoreBreakdown.priorityBonus, 0.15);

  // 2. Candidate with custom plan entitlement (priorityScoreBonus = 0.30)
  const scoredCustom = scoreDrivers(
    [
      {
        ...baseCandidate,
        priorityMatching: true,
        entitlements: { priorityScoreBonus: 0.30 },
      },
    ],
    12.975,
    77.598
  );
  assert.equal(scoredCustom[0].scoreBreakdown.priorityBonus, 0.30);
  assert.ok(scoredCustom[0].score > scoredStandard[0].score);

  // 3. Candidate without priority bonus
  const scoredNormal = scoreDrivers(
    [{ ...baseCandidate, priorityMatching: false }],
    12.975,
    77.598
  );
  assert.equal(scoredNormal[0].scoreBreakdown.priorityBonus, 0.0);
});

test('4. Group Exclusivity & Pricing Resolution logic', async () => {
  const publicPlan = {
    id: 'plan_pub_1',
    name: 'Standard Monthly',
    priceMinor: 5000,
    allowedGroupIds: null,
  };

  const exclusivePlan = {
    id: 'plan_excl_1',
    name: 'EV Super Pass',
    priceMinor: 2500,
    allowedGroupIds: ['a0000000-0000-0000-0000-000000000001'],
  };

  // Driver with no driverId accessing public plan -> succeeds
  const resPublic = await resolvePlanPricingForDriver(publicPlan, null);
  assert.equal(resPublic.priceMinor, 5000);
  assert.equal(resPublic.originalPriceMinor, 5000);

  // Driver with no driverId accessing exclusive plan -> returns null (not accessible)
  const resExclUnauth = await resolvePlanPricingForDriver(exclusivePlan, null);
  assert.equal(resExclUnauth, null);
});

test('5. Driver Group Service — CRUD and code normalization', async () => {
  const { createGroup, getGroupById, updateGroup, deleteGroup } = await import('../src/modules/driver-group/driver-group.service.js');
  const testCode = `TEST_GRP_${Date.now()}`;

  // Create
  const group = await createGroup({
    name: 'Test Automation Group',
    code: testCode.toLowerCase(), // should normalize to upper
    description: 'A test cohort for verification',
    isActive: true,
  });

  assert.ok(group.id);
  assert.equal(group.code, testCode);
  assert.equal(group.name, 'Test Automation Group');

  // Read
  const fetched = await getGroupById(group.id);
  assert.equal(fetched.id, group.id);
  assert.equal(fetched.memberCount, 0);

  // Update
  const updated = await updateGroup(group.id, {
    name: 'Updated Automation Group',
    isActive: false,
  });
  assert.equal(updated.name, 'Updated Automation Group');
  assert.equal(updated.isActive, false);

  // Cleanup / Delete
  const deleted = await deleteGroup(group.id);
  assert.equal(deleted.success, true);
});

// Clean exit after all tests finish
setTimeout(() => {
  process.exit(0);
}, 3500).unref();



