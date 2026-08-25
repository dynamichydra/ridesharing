import { eq, and, lte, sql } from 'drizzle-orm';
import { db } from '../config/db.js';
import { rides } from '../../drizzle/schema/index.js';
import { startMatchingProcess } from '../modules/matching/matching.service.js';
import { recordStatusChange } from '../modules/ride/ride_status_history.service.js';
import { publishEvent, TOPICS } from '../config/kafka.js';

export async function dispatchDueScheduledRides() {
  const dispatchThreshold = new Date(Date.now() + 15 * 60 * 1000); // 15 mins from now

  const dueRides = await db.select().from(rides).where(and(
    eq(rides.status, 'scheduled'),
    lte(rides.scheduledAt, dispatchThreshold),
  ));

  if (!dueRides.length) return { dispatchedCount: 0 };

  let dispatchedCount = 0;

  for (const ride of dueRides) {
    const [updated] = await db.update(rides).set({
      status: 'searching',
    }).where(and(eq(rides.id, ride.id), eq(rides.status, 'scheduled'))).returning();

    if (updated) {
      dispatchedCount++;

      await recordStatusChange({
        rideId: updated.id,
        fromStatus: 'scheduled',
        toStatus: 'searching',
        changedBy: 'system',
        reason: 'Scheduled ride auto-dispatched by system worker',
      }).catch(() => {});

      await publishEvent(TOPICS.RIDE_REQUESTED, { id: updated.id, ...updated }).catch(() => {});
      await publishEvent(TOPICS.NOTIF_PUSH, {
        userType: 'rider',
        userId: updated.riderId,
        type: 'SCHEDULED_RIDE_DISPATCHING',
        title: 'Scheduled Ride Starting',
        body: 'We are now searching for nearby drivers for your scheduled ride.',
        rideId: updated.id,
      }).catch(() => {});

      // Non-blocking matching process
      startMatchingProcess(updated);
    }
  }

  console.log(`[ScheduledRideDispatch] Dispatched ${dispatchedCount} due scheduled ride(s)`);
  return { dispatchedCount };
}
