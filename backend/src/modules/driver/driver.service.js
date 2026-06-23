import { eq, desc, count, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers, subscriptions } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';

export async function getProfile(driverId) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };
  const { aadharNumber, ...safe } = driver;
  return safe;
}

export async function updateProfile(driverId, data) {
  const allowed = ['name', 'email', 'vehicleNumber', 'vehicleModel', 'vehicleYear', 'fcmToken'];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  updates.updatedAt = new Date();
  const [updated] = await db.update(drivers).set(updates).where(eq(drivers.id, driverId)).returning();
  return updated;
}

export async function submitDocuments(driverId, docs) {
  const [updated] = await db.update(drivers).set({
    licenseNumber: docs.licenseNumber,
    licenseDoc: docs.licenseDoc,
    aadharNumber: docs.aadharNumber,
    aadharDoc: docs.aadharDoc,
    vehicleTypeId: docs.vehicleTypeId,
    vehicleNumber: docs.vehicleNumber,
    vehicleModel: docs.vehicleModel,
    vehiclePhoto: docs.vehiclePhoto,
    approvalStatus: 'pending',
    updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: driverId, actorType: 'driver',
    action: 'DOCUMENTS_SUBMITTED', entityType: 'driver', entityId: driverId,
  });
  return updated;
}

export async function goOnline(driverId, lat, lng) {
  const [driver] = await db.select({
    subscriptionStatus: drivers.subscriptionStatus,
    approvalStatus: drivers.approvalStatus,
    isBlocked: drivers.isBlocked,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  if (!driver) throw { statusCode: 404, message: 'Driver not found' };
  if (driver.isBlocked) throw { statusCode: 403, message: 'Account is blocked' };
  if (driver.approvalStatus !== 'approved') throw { statusCode: 403, message: 'Account not approved yet' };
  if (driver.subscriptionStatus !== 'active') throw { statusCode: 403, message: 'No active subscription' };

  await db.update(drivers).set({
    isOnline: true, currentLat: String(lat), currentLng: String(lng), lastLocationAt: new Date(),
  }).where(eq(drivers.id, driverId));

  await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
  await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: true, lat, lng });
  return { isOnline: true };
}

export async function goOffline(driverId) {
  await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
  await redis.del(REDIS_KEYS.driverLocation(driverId));
  await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: false });
  return { isOnline: false };
}

export async function updateLocation(driverId, lat, lng) {
  await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
  // Batch DB write — we only need to update DB every 30s, real-time from Redis
  await db.update(drivers).set({
    currentLat: String(lat), currentLng: String(lng), lastLocationAt: new Date(),
  }).where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.DRIVER_LOCATION, { driverId, lat, lng, ts: Date.now() });
  return { updated: true };
}

export async function updateFcmToken(driverId, fcmToken) {
  await db.update(drivers).set({ fcmToken }).where(eq(drivers.id, driverId));
  return { updated: true };
}

// ── Admin facing ─────────────────────────────────────────────────────────────

export async function listDrivers(filters, page, limit, offset) {
  const conditions = [];
  if (filters.approvalStatus) conditions.push(eq(drivers.approvalStatus, filters.approvalStatus));
  if (filters.subscriptionStatus) conditions.push(eq(drivers.subscriptionStatus, filters.subscriptionStatus));
  if (filters.isBlocked !== undefined) conditions.push(eq(drivers.isBlocked, filters.isBlocked));

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(drivers).where(where);
  const rows = await db.select().from(drivers).where(where)
    .orderBy(desc(drivers.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function approveDriver(driverId, adminId, note) {
  const [driver] = await db.update(drivers).set({
    approvalStatus: 'approved', approvedBy: adminId, approvedAt: new Date(), approvalNote: note,
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Account Approved!', body: 'You can now go online and accept rides.',
    type: 'ACCOUNT_APPROVED',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_APPROVED', entityType: 'driver', entityId: driverId,
  });
  return driver;
}

export async function rejectDriver(driverId, adminId, note) {
  const [driver] = await db.update(drivers).set({
    approvalStatus: 'rejected', approvedBy: adminId, approvalNote: note,
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Application Rejected', body: note || 'Please contact support.',
    type: 'ACCOUNT_REJECTED',
  });
  return driver;
}

export async function blockDriver(driverId, adminId) {
  await db.update(drivers).set({ isBlocked: true, isOnline: false }).where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_BLOCKED', entityType: 'driver', entityId: driverId,
  });
  return { blocked: true };
}

export async function unblockDriver(driverId, adminId) {
  await db.update(drivers).set({ isBlocked: false }).where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_UNBLOCKED', entityType: 'driver', entityId: driverId,
  });
  return { blocked: false };
}
