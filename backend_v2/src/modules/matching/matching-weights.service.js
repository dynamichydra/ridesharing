import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { matchingWeights } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { DEFAULT_WEIGHTS } from './scoring.service.js';

/**
 * Active scoring weights, cached in Redis (same TTL-cache pattern as fareCache)
 * so a config change is picked up within 5 minutes without a deploy, but hot-path
 * matching doesn't hit Postgres on every ring.
 */
export async function getActiveWeights() {
  const cached = await redis.get(REDIS_KEYS.matchingWeights);
  if (cached) return JSON.parse(cached);

  const [row] = await db.select().from(matchingWeights)
    .where(eq(matchingWeights.isActive, true)).limit(1);

  const weights = row ? {
    distanceWeight: parseFloat(row.distanceWeight),
    ratingWeight: parseFloat(row.ratingWeight),
    acceptanceRateWeight: parseFloat(row.acceptanceRateWeight),
  } : DEFAULT_WEIGHTS;

  await redis.setex(REDIS_KEYS.matchingWeights, 300, JSON.stringify(weights));
  return weights;
}
