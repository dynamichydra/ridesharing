import crypto from 'crypto';
import { eq, and, count, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { trustedContacts, sosAlerts, tripShareTokens, rides, users, drivers } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { paginate } from '../../utils/response.js';
import { publishNotification } from '../notification/notification-events.js';
import { moment } from '../../utils/time.js';

// ── Trusted Contacts ─────────────────────────────────────────────────────────

export async function addTrustedContact(userId, data) {
  if (!data.name || !data.phone) {
    throw { statusCode: 400, message: 'name and phone are required' };
  }

  const [{ count: total }] = await db.select({ count: count() })
    .from(trustedContacts)
    .where(eq(trustedContacts.userId, userId));

  if (total >= 5) {
    throw { statusCode: 400, message: 'You can add up to 5 trusted contacts maximum' };
  }

  const [contact] = await db.insert(trustedContacts).values({
    userId,
    name: String(data.name).trim(),
    phone: String(data.phone).trim(),
    email: data.email ? String(data.email).trim() : null,
    relationship: data.relationship || null,
    isEmergencyContact: data.isEmergencyContact !== undefined ? Boolean(data.isEmergencyContact) : true,
  }).returning();

  return contact;
}

export async function listTrustedContacts(userId) {
  return db.select().from(trustedContacts).where(eq(trustedContacts.userId, userId));
}

export async function deleteTrustedContact(userId, contactId) {
  const [deleted] = await db.delete(trustedContacts)
    .where(and(eq(trustedContacts.id, contactId), eq(trustedContacts.userId, userId)))
    .returning();

  if (!deleted) throw { statusCode: 404, message: 'Trusted contact not found' };
  return deleted;
}

// ── SOS Emergency Trigger ─────────────────────────────────────────────────────

export async function triggerSosAlert(rideId, requester, { lat, lng } = {}) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  if (ride.riderId !== requester.id && ride.driverId !== requester.id) {
    throw { statusCode: 403, message: 'Not authorized to trigger SOS for this ride' };
  }

  const activeStatuses = ['searching', 'accepted', 'arriving', 'started'];
  if (!activeStatuses.includes(ride.status)) {
    throw { statusCode: 400, message: `Cannot trigger SOS for a ride in status: ${ride.status}` };
  }

  let alertLat = lat || ride.pickupLat;
  let alertLng = lng || ride.pickupLng;

  if (ride.driverId) {
    const rawPos = await redis.get(REDIS_KEYS.driverLocation(ride.driverId));
    if (rawPos) {
      try {
        const parsed = JSON.parse(rawPos);
        alertLat = parsed.lat || alertLat;
        alertLng = parsed.lng || alertLng;
      } catch {}
    }
  }

  const [alert] = await db.insert(sosAlerts).values({
    rideId,
    userId: requester.id,
    userType: requester.role,
    lat: alertLat ? String(alertLat) : null,
    lng: alertLng ? String(alertLng) : null,
    status: 'triggered',
  }).returning();

  // Send notifications to all trusted contacts of the rider
  const contacts = await listTrustedContacts(ride.riderId);
  const [rider] = await db.select({ name: users.name, phone: users.phone })
    .from(users).where(eq(users.id, ride.riderId)).limit(1);

  for (const contact of contacts) {
    await publishEvent(TOPICS.NOTIF_SMS, {
      userId: ride.riderId,
      userType: 'rider',
      type: 'SOS_EMERGENCY_ALERT',
      phone: contact.phone,
      title: 'EMERGENCY SOS ALERT',
      body: `EMERGENCY ALERT: ${rider?.name || 'Your contact'} has pressed the SOS button during ride ${rideId}. Pickup: ${ride.pickupAddress || 'N/A'}. Drop: ${ride.dropAddress || 'N/A'}.`,
      rideId,
    }).catch(() => {});
  }

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: requester.id,
    actorType: requester.role,
    action: 'EMERGENCY_SOS_TRIGGERED',
    entityType: 'sos_alert',
    entityId: alert.id,
    meta: { rideId, lat: alertLat, lng: alertLng },
  });

  return {
    alertId: alert.id,
    rideId: alert.rideId,
    status: alert.status,
    notifiedContactsCount: contacts.length,
    message: 'Emergency SOS alert dispatched to contacts and safety ops',
  };
}

// ── Live Trip Sharing ─────────────────────────────────────────────────────────

export async function generateShareToken(rideId, riderId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Only the primary rider can share live trip status' };

  const [existing] = await db.select().from(tripShareTokens)
    .where(and(eq(tripShareTokens.rideId, rideId), eq(tripShareTokens.riderId, riderId)))
    .limit(1);

  if (existing && moment(existing.expiresAt).isAfter(moment())) {
    return {
      token: existing.token,
      sharePath: `/api/v1/tracking/public/${existing.token}`,
      expiresAt: existing.expiresAt,
    };
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = moment().add(24, 'hours').toDate(); // 24h validity

  const [created] = await db.insert(tripShareTokens).values({
    rideId,
    riderId,
    token,
    expiresAt,
  }).returning();

  return {
    token: created.token,
    sharePath: `/api/v1/tracking/public/${created.token}`,
    expiresAt: created.expiresAt,
  };
}

export async function getPublicTripTracking(token) {
  if (!token) throw { statusCode: 400, message: 'Share token is required' };

  const [shareRecord] = await db.select().from(tripShareTokens)
    .where(eq(tripShareTokens.token, token)).limit(1);

  if (!shareRecord) throw { statusCode: 404, message: 'Invalid or expired trip share link' };
  if (moment(shareRecord.expiresAt).isBefore(moment())) {
    throw { statusCode: 410, message: 'This trip share link has expired' };
  }

  const [ride] = await db.select().from(rides).where(eq(rides.id, shareRecord.rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  const [rider] = await db.select({ name: users.name }).from(users).where(eq(users.id, ride.riderId)).limit(1);

  let driverInfo = null;
  let liveLocation = null;

  if (ride.driverId) {
    const [driver] = await db.select({
      name: drivers.name,
      vehicleModel: drivers.vehicleModel,
      vehicleNumber: drivers.vehicleNumber,
      rating: drivers.rating,
      profilePhoto: drivers.profilePhoto,
    }).from(drivers).where(eq(drivers.id, ride.driverId)).limit(1);

    driverInfo = driver || null;

    const rawLocation = await redis.get(REDIS_KEYS.driverLocation(ride.driverId));
    if (rawLocation) {
      try { liveLocation = JSON.parse(rawLocation); } catch {}
    }
  }

  return {
    rideId: ride.id,
    status: ride.status,
    riderName: rider?.name || 'Rider',
    pickupAddress: ride.pickupAddress,
    dropAddress: ride.dropAddress,
    pickupLat: ride.pickupLat,
    pickupLng: ride.pickupLng,
    dropLat: ride.dropLat,
    dropLng: ride.dropLng,
    polyline: ride.polyline,
    estimatedFareMinor: ride.estimatedFareMinor,
    currencyCode: ride.currencyCode,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    driver: driverInfo,
    liveLocation,
  };
}

// ── Admin Safety Ops ─────────────────────────────────────────────────────────

export async function listSosAlerts(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status) conditions.push(eq(sosAlerts.status, filters.status));
  if (filters.userType) conditions.push(eq(sosAlerts.userType, filters.userType));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(sosAlerts).where(where);
  const rows = await db.select().from(sosAlerts).where(where)
    .orderBy(desc(sosAlerts.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function resolveSosAlert(alertId, adminId, resolutionNotes) {
  const [alert] = await db.select().from(sosAlerts).where(eq(sosAlerts.id, alertId)).limit(1);
  if (!alert) throw { statusCode: 404, message: 'SOS alert not found' };

  const [updated] = await db.update(sosAlerts)
    .set({
      status: 'resolved',
      resolutionNotes: resolutionNotes || 'Resolved by safety support',
      resolvedById: adminId,
      resolvedAt: new Date(),
    })
    .where(eq(sosAlerts.id, alertId))
    .returning();

  return updated;
}
