import { redis } from '../../config/redis.js';
import { REDIS_KEYS } from '../../config/redis.js';
import { metrics } from '../../utils/metrics.js';

/**
 * Distributed per-driver offer lock — prevents driver X being included in two
 * concurrent rides' candidate offer sets at once. Acquired atomically via
 * `SET NX PX` right before a driver is added to a ring's offer batch; a failed
 * acquire means another ride currently holds the driver, so that candidate is
 * simply skipped (the caller backfills from the next-ranked candidate instead).
 */

/** Returns true if the lock was acquired, false if the driver is already locked. */
export async function acquireLock(driverId, rideId, ttlMs) {
  const key = REDIS_KEYS.driverOfferLock(driverId);
  const result = await redis.set(key, rideId, 'PX', ttlMs, 'NX');
  const acquired = result === 'OK';
  metrics.lockAcquireTotal.inc({ result: acquired ? 'success' : 'contended' });
  return acquired;
}

/** Releases locks for a batch of driver IDs — only clears a lock if it's still ours. */
export async function releaseLocks(driverIds, rideId) {
  if (!driverIds?.length) return;
  const pipeline = redis.pipeline();
  for (const driverId of driverIds) {
    pipeline.get(REDIS_KEYS.driverOfferLock(driverId));
  }
  const results = await pipeline.exec();

  const releasePipeline = redis.pipeline();
  let toRelease = 0;
  driverIds.forEach((driverId, i) => {
    const [, value] = results[i];
    if (value === rideId) {
      releasePipeline.del(REDIS_KEYS.driverOfferLock(driverId));
      toRelease++;
    }
  });
  if (toRelease > 0) await releasePipeline.exec();
}
