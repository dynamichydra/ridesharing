import { and, eq, sql, lt } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rides, rideOffers, dispatchJobs, drivers } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

/**
 * Matching Reconciliation Service
 *
 * Runs periodically to recover stuck dispatches, release orphaned driver locks,
 * and clean up lingering temporary state.
 */

/**
 * Reconciles stuck searching rides and cleans expired state.
 */
export async function runMatchingReconciliation() {
  const report = {
    stuckRidesExpired: 0,
    orphanedLocksReleased: 0,
    staleJobsCleaned: 0,
  };

  try {
    // 1. Find searching rides that have been searching for > 4 minutes (stuck matching runs)
    const stuckRides = await db
      .select({ id: rides.id, riderId: rides.riderId })
      .from(rides)
      .where(
        and(
          eq(rides.status, 'searching'),
          sql`${rides.requestedAt} < NOW() - INTERVAL '4 minutes'`
        )
      );

    for (const stuck of stuckRides) {
      await db
        .update(rides)
        .set({
          status: 'expired',
          cancelledAt: new Date(),
          cancelledBy: 'system',
          cancelReason: 'Matching timed out (reconciliation)',
        })
        .where(and(eq(rides.id, stuck.id), eq(rides.status, 'searching')));

      await redis.del(REDIS_KEYS.rideRequest(stuck.id));
      await redis.del(`ride:candidates:${stuck.id}`);

      await publishEvent(TOPICS.RIDE_CANCELLED, {
        id: stuck.id,
        rideId: stuck.id,
        riderId: stuck.riderId,
        cancelledBy: 'system',
        reason: 'matching_timeout',
      });

      report.stuckRidesExpired++;
    }

    // 2. Reconcile dispatch jobs in 'searching' state for > 5 minutes
    const stuckJobs = await db
      .update(dispatchJobs)
      .set({
        status: 'exhausted',
        completedAt: new Date(),
        failureReason: 'Reconciliation timeout',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dispatchJobs.status, 'searching'),
          sql`${dispatchJobs.startedAt} < NOW() - INTERVAL '5 minutes'`
        )
      )
      .returning();

    report.staleJobsCleaned = stuckJobs.length;

    // 3. Scan and release orphaned driver locks
    const lockKeys = await redis.keys('driver:lock:*');
    for (const key of lockKeys) {
      const driverId = key.replace('driver:lock:', '');
      const rideId = await redis.get(key);

      if (rideId) {
        const [ride] = await db
          .select({ status: rides.status })
          .from(rides)
          .where(eq(rides.id, rideId))
          .limit(1);

        if (!ride || ride.status !== 'searching') {
          await redis.del(key);
          report.orphanedLocksReleased++;
        }
      }
    }
  } catch (err) {
    console.error('[Matching/Reconciliation] Error running reconciliation:', err.message);
  }

  return report;
}
