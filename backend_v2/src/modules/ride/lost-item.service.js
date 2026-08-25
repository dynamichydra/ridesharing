import { eq, and, or, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { lostItems, rides, users, drivers } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

export async function reportLostItem({
  rideId,
  userId,
  userRole,
  itemCategory,
  description,
  contactPhone,
  photoUrl = null,
}) {
  if (!itemCategory || !description) {
    throw { statusCode: 400, message: 'itemCategory and description are required' };
  }

  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  if (userRole === 'rider' && ride.riderId !== userId) {
    throw { statusCode: 403, message: 'Unauthorized: Not your ride' };
  }
  if (userRole === 'driver' && ride.driverId !== userId) {
    throw { statusCode: 403, message: 'Unauthorized: Not your ride' };
  }

  const [report] = await db.insert(lostItems).values({
    rideId,
    reporterId: userId,
    reporterRole: userRole,
    driverId: ride.driverId || null,
    itemCategory,
    description: description.trim(),
    contactPhone: contactPhone || null,
    photoUrl: photoUrl || null,
    status: 'open',
  }).returning();

  // Notify the other party
  if (userRole === 'rider' && ride.driverId) {
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver',
      userId: ride.driverId,
      type: 'LOST_ITEM_REPORTED',
      title: 'Lost Item Report Filed 📦',
      body: `A passenger reported a lost ${itemCategory} on ride #${rideId.slice(0, 8)}. Please check your vehicle.`,
    });
  } else if (userRole === 'driver' && ride.riderId) {
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'rider',
      userId: ride.riderId,
      type: 'LOST_ITEM_FOUND',
      title: 'Item Found in Vehicle! 📦',
      body: `Your driver reported finding a ${itemCategory} from ride #${rideId.slice(0, 8)}.`,
    });
  }

  return report;
}

export async function listMyLostItems(userId) {
  return db.select().from(lostItems)
    .where(or(eq(lostItems.reporterId, userId), eq(lostItems.driverId, userId)))
    .orderBy(desc(lostItems.createdAt));
}

export async function getRideLostItems(rideId, userId, userRole) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  if (userRole === 'rider' && ride.riderId !== userId) throw { statusCode: 403, message: 'Unauthorized' };
  if (userRole === 'driver' && ride.driverId !== userId) throw { statusCode: 403, message: 'Unauthorized' };

  return db.select().from(lostItems)
    .where(eq(lostItems.rideId, rideId))
    .orderBy(desc(lostItems.createdAt));
}

export async function updateLostItemStatus(reportId, userId, userRole, { status, resolutionNotes }) {
  const validStatuses = ['open', 'driver_contacted', 'item_found', 'returning', 'returned', 'closed'];
  if (!validStatuses.includes(status)) {
    throw { statusCode: 400, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
  }

  const [existing] = await db.select().from(lostItems).where(eq(lostItems.id, reportId)).limit(1);
  if (!existing) throw { statusCode: 404, message: 'Lost item report not found' };

  if (userRole !== 'admin' && existing.reporterId !== userId && existing.driverId !== userId) {
    throw { statusCode: 403, message: 'Unauthorized' };
  }

  const [updated] = await db.update(lostItems).set({
    status,
    resolutionNotes: resolutionNotes || existing.resolutionNotes,
    resolvedAt: ['returned', 'closed'].includes(status) ? new Date() : existing.resolvedAt,
    updatedAt: new Date(),
  }).where(eq(lostItems.id, reportId)).returning();

  return updated;
}
