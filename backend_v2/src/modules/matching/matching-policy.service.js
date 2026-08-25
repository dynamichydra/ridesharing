import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { matchingPolicies } from '../../../drizzle/schema/index.js';
import { redis } from '../../config/redis.js';

/**
 * Matching Policy Service
 *
 * Resolves hierarchical matching policies:
 * 1. Specific Service Type + Zone
 * 2. Specific Zone
 * 3. Specific City
 * 4. Specific Country
 * 5. Global Active Policy
 */

const DEFAULT_GLOBAL_POLICY = Object.freeze({
  id: null,
  name: 'Default Global Policy',
  version: 'v1.0.0',
  scope: 'global',
  initialRadiusKm: 1.5,
  maxRadiusKm: 15.0,
  radiusStepKm: 2.0,
  offerTimeoutSeconds: 15,
  maxWaves: 4,
  maxCandidatesPerWave: 5,
  cooldownSeconds: 60,
  maxEtaMinutes: 20,
  maxLocationAgeSeconds: 60,
  weights: {
    etaWeight: 0.40,
    distanceWeight: 0.15,
    idleWeight: 0.10,
    ratingWeight: 0.10,
    acceptanceRateWeight: 0.10,
    cancellationRateWeight: 0.05,
    directionWeight: 0.05,
    zoneDemandWeight: 0.05,
  },
  waveConfig: [
    { wave: 1, topCount: 2, timeoutSec: 15 },
    { wave: 2, topCount: 3, timeoutSec: 15 },
    { wave: 3, topCount: 5, timeoutSec: 20 },
    { wave: 4, topCount: 10, timeoutSec: 25 },
  ],
});

/**
 * Resolves matching policy for a ride based on location and service type.
 */
export async function getEffectiveMatchingPolicy({ serviceType = null, zoneId = null, cityId = null, countryId = null } = {}) {
  const cacheKey = `matching:policy:${serviceType || 'any'}:${zoneId || 'any'}:${cityId || 'any'}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch (err) {
    // Cache read error non-fatal
  }

  // Query database in priority hierarchy
  const allActive = await db
    .select()
    .from(matchingPolicies)
    .where(eq(matchingPolicies.isActive, true))
    .orderBy(desc(matchingPolicies.createdAt));

  let matchedPolicy = null;

  // 1. Service Type match
  if (serviceType) {
    matchedPolicy = allActive.find((p) => p.scope === 'service_type' && p.serviceType === serviceType);
  }

  // 2. Zone match
  if (!matchedPolicy && zoneId) {
    matchedPolicy = allActive.find((p) => p.scope === 'zone' && p.scopeId === zoneId);
  }

  // 3. City match
  if (!matchedPolicy && cityId) {
    matchedPolicy = allActive.find((p) => p.scope === 'city' && p.scopeId === cityId);
  }

  // 4. Country match
  if (!matchedPolicy && countryId) {
    matchedPolicy = allActive.find((p) => p.scope === 'country' && p.scopeId === countryId);
  }

  // 5. Global Policy
  if (!matchedPolicy) {
    matchedPolicy = allActive.find((p) => p.scope === 'global');
  }

  const effective = matchedPolicy
    ? {
        ...DEFAULT_GLOBAL_POLICY,
        ...matchedPolicy,
        initialRadiusKm: parseFloat(matchedPolicy.initialRadiusKm),
        maxRadiusKm: parseFloat(matchedPolicy.maxRadiusKm),
        radiusStepKm: parseFloat(matchedPolicy.radiusStepKm),
      }
    : DEFAULT_GLOBAL_POLICY;

  try {
    await redis.setex(cacheKey, 300, JSON.stringify(effective));
  } catch (err) {
    // Cache write error non-fatal
  }

  return effective;
}

/**
 * Lists all matching policies for admin configuration.
 */
export async function listMatchingPolicies() {
  return db.select().from(matchingPolicies).orderBy(desc(matchingPolicies.createdAt));
}

/**
 * Upserts a matching policy.
 */
export async function upsertMatchingPolicy(data) {
  let result;
  if (data.id) {
    const [updated] = await db
      .update(matchingPolicies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(matchingPolicies.id, data.id))
      .returning();
    result = updated;
  } else {
    const [created] = await db.insert(matchingPolicies).values(data).returning();
    result = created;
  }

  // Invalidate policy cache
  const keys = await redis.keys('matching:policy:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }

  return result;
}
