import { eq, and, sql, asc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { airportQueues, airportQueueEntries, zones } from '../../../drizzle/schema/index.js';
import { redis } from '../../config/redis.js';

/**
 * Airport Queue Service
 *
 * Implements FIFO driver queueing for airport terminals and high-density transit zones.
 */

/**
 * Finds if a coordinate pair falls into an active airport queue zone.
 */
export async function getAirportQueueByZone(zoneId) {
  const [queue] = await db
    .select()
    .from(airportQueues)
    .where(and(eq(airportQueues.zoneId, zoneId), eq(airportQueues.status, 'active')))
    .limit(1);
  return queue || null;
}

/**
 * Adds a driver to the airport FIFO queue upon entering the airport zone.
 */
export async function joinAirportQueue({ driverId, zoneId, vehicleTypeId = null }) {
  const queue = await getAirportQueueByZone(zoneId);
  if (!queue) return null;

  // Check if driver already has an active waiting entry
  const [existing] = await db
    .select()
    .from(airportQueueEntries)
    .where(
      and(
        eq(airportQueueEntries.queueId, queue.id),
        eq(airportQueueEntries.driverId, driverId),
        eq(airportQueueEntries.status, 'waiting')
      )
    )
    .limit(1);

  if (existing) {
    return existing;
  }

  // Determine next position
  const [countRow] = await db
    .select({ total: count() })
    .from(airportQueueEntries)
    .where(and(eq(airportQueueEntries.queueId, queue.id), eq(airportQueueEntries.status, 'waiting')));

  const nextPos = (Number(countRow?.total) || 0) + 1;

  const [entry] = await db
    .insert(airportQueueEntries)
    .values({
      queueId: queue.id,
      driverId,
      vehicleTypeId,
      queuePosition: nextPos,
      status: 'waiting',
      enteredAt: new Date(),
      lastSeenAt: new Date(),
    })
    .returning();

  return entry;
}

/**
 * Driver leaves airport zone or goes offline -> removes from queue and reindexes positions.
 */
export async function leaveAirportQueue(driverId, queueId = null) {
  const conditions = [
    eq(airportQueueEntries.driverId, driverId),
    eq(airportQueueEntries.status, 'waiting'),
  ];
  if (queueId) conditions.push(eq(airportQueueEntries.queueId, queueId));

  const [left] = await db
    .update(airportQueueEntries)
    .set({
      status: 'left',
      leftAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(...conditions))
    .returning();

  if (left) {
    // Reindex remaining queue positions in background
    reindexQueuePositions(left.queueId).catch((err) =>
      console.error('[AirportQueue] reindex error:', err.message)
    );
  }

  return left;
}

/**
 * Recompacts queue positions (1, 2, 3...) after departures.
 */
export async function reindexQueuePositions(queueId) {
  const waitingEntries = await db
    .select({ id: airportQueueEntries.id })
    .from(airportQueueEntries)
    .where(and(eq(airportQueueEntries.queueId, queueId), eq(airportQueueEntries.status, 'waiting')))
    .orderBy(asc(airportQueueEntries.enteredAt));

  for (let i = 0; i < waitingEntries.length; i++) {
    await db
      .update(airportQueueEntries)
      .set({ queuePosition: i + 1 })
      .where(eq(airportQueueEntries.id, waitingEntries[i].id));
  }
}

/**
 * Returns top waiting drivers in FIFO order for airport ride requests.
 */
export async function getNextAirportCandidates(queueId, vehicleTypeId = null, limit = 5) {
  const conditions = [
    eq(airportQueueEntries.queueId, queueId),
    eq(airportQueueEntries.status, 'waiting'),
  ];
  if (vehicleTypeId) {
    conditions.push(eq(airportQueueEntries.vehicleTypeId, vehicleTypeId));
  }

  const entries = await db
    .select({
      id: airportQueueEntries.id,
      driverId: airportQueueEntries.driverId,
      queuePosition: airportQueueEntries.queuePosition,
      enteredAt: airportQueueEntries.enteredAt,
    })
    .from(airportQueueEntries)
    .where(and(...conditions))
    .orderBy(asc(airportQueueEntries.queuePosition))
    .limit(limit);

  return entries;
}

/**
 * Returns queue diagnostics for operations and drivers.
 */
export async function getAirportQueueStatus(zoneId) {
  const queue = await getAirportQueueByZone(zoneId);
  if (!queue) return { active: false };

  const [totalRow] = await db
    .select({ total: count() })
    .from(airportQueueEntries)
    .where(and(eq(airportQueueEntries.queueId, queue.id), eq(airportQueueEntries.status, 'waiting')));

  return {
    active: true,
    queueId: queue.id,
    name: queue.name,
    code: queue.code,
    totalWaiting: Number(totalRow?.total || 0),
    maxCapacity: queue.maxCapacity,
  };
}
