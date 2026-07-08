import { eq, desc, count, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers, subscriptions, cities } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';
import { createUploadUrl, verifyObjectExists } from '../../utils/storage.js';
import * as vehicleService from '../vehicle/vehicle.service.js';
import * as documentsService from '../documents/documents.service.js';
import * as onboardingService from '../onboarding/onboarding.service.js';

export async function getProfile(driverId) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };
  const { aadharNumber, ...safe } = driver;
  return safe;
}

export async function updateProfile(driverId, data) {
  const allowed = [
    'name', 'email', 'vehicleNumber', 'vehicleModel', 'vehicleYear', 'fcmToken',
    'dateOfBirth', 'gender', 'referralCode', 'preferredLanguageCode', 'profilePhoto',
  ];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  updates.updatedAt = new Date();
  const [updated] = await db.update(drivers).set(updates).where(eq(drivers.id, driverId)).returning();

  const touchedPersonalInfo = ['name', 'dateOfBirth', 'gender', 'referralCode'].some((f) => f in data);
  if (touchedPersonalInfo) await advanceRegistration(driverId, REGISTRATION_STEP.PERSONAL_INFO);

  return updated;
}

export async function updateDrivingLocation(driverId, { countryId, stateId, cityId }) {
  const [city] = await db.select().from(cities).where(eq(cities.id, cityId)).limit(1);
  if (!city || !city.isActive) throw { statusCode: 400, code: 'CITY_INACTIVE', message: 'Selected city is not available' };
  if (city.stateId !== stateId || city.countryId !== countryId) {
    throw { statusCode: 400, message: 'City does not belong to the given state/country' };
  }

  const [updated] = await db.update(drivers).set({
    countryId, stateId, cityId, updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await advanceRegistration(driverId, REGISTRATION_STEP.LOCATION);
  return updated;
}

export async function requestProfilePhotoUploadUrl(contentType) {
  return createUploadUrl('driver-profile-photos', contentType, 5);
}

export async function confirmProfilePhoto(driverId, key) {
  await verifyObjectExists(key, 5);
  const [updated] = await db.update(drivers).set({ profilePhoto: key, updatedAt: new Date() })
    .where(eq(drivers.id, driverId)).returning();
  await advanceRegistration(driverId, REGISTRATION_STEP.PHOTO);
  return updated;
}

// Legacy single-shot document submission — superseded by the documents module,
// kept for backward compatibility with any client still calling it.
export async function submitDocuments(driverId, docs) {
  const [updated] = await db.update(drivers).set({
    licenseNumber:  docs.licenseNumber,
    licenseDoc:     docs.licenseDoc,
    aadharNumber:   docs.aadharNumber,
    aadharDoc:      docs.aadharDoc,
    vehicleTypeId:  docs.vehicleTypeId,
    vehicleNumber:  docs.vehicleNumber,
    vehicleModel:   docs.vehicleModel,
    vehiclePhoto:   docs.vehiclePhoto,
    approvalStatus: 'pending',
    updatedAt:      new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: driverId, actorType: 'driver',
    action: 'DOCUMENTS_SUBMITTED', entityType: 'driver', entityId: driverId,
  });
  return updated;
}

// ── Registration summary / submit ────────────────────────────────────────────

export async function getRegistrationSummary(driverId) {
  const driver = await getProfile(driverId);
  const [vehicles, myDocuments, answers, missingAnswers] = await Promise.all([
    vehicleService.listMyVehicles(driverId),
    documentsService.listMyDocuments(driverId),
    onboardingService.getMyAnswers(driverId),
    onboardingService.getMissingRequiredAnswers(driverId, driver.countryId),
  ]);

  const requiredDocTypes = await documentsService.getRequiredDocumentTypesFor(driver.countryId, driver.cityId, driver.vehicleTypeId);
  const uploadedDocTypeIds = new Set(myDocuments.map((d) => d.documentTypeId));
  const missingDocuments = requiredDocTypes.filter((t) => t.isRequired && !uploadedDocTypeIds.has(t.id)).map((t) => t.code);

  const pendingLegalAcceptance = await onboardingService.hasPendingLegalAcceptance(driverId, driver.countryId);

  const missing = [
    ...(driver.name ? [] : ['name']),
    ...(driver.countryId && driver.stateId && driver.cityId ? [] : ['drivingLocation']),
    ...(vehicles.some((v) => v.isActive) ? [] : ['vehicle']),
    ...(pendingLegalAcceptance ? ['legalAcceptance'] : []),
    ...missingAnswers.map((code) => `question:${code}`),
    ...missingDocuments.map((code) => `document:${code}`),
  ];

  return {
    driver, vehicles, documents: myDocuments, answers,
    isComplete: missing.length === 0,
    missing,
  };
}

export async function submitApplication(driverId) {
  const summary = await getRegistrationSummary(driverId);
  if (!summary.isComplete) {
    throw { statusCode: 422, code: 'INCOMPLETE_REQUIRED_FIELDS', message: 'Registration is incomplete', missing: summary.missing };
  }

  const [updated] = await db.update(drivers).set({
    registrationStatus: 'pending_review', registrationStep: REGISTRATION_STEP.SUBMITTED, updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.DRIVER_REGISTRATION_SUBMITTED, { driverId });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: driverId, actorType: 'driver',
    action: 'REGISTRATION_SUBMITTED', entityType: 'driver', entityId: driverId,
  });
  return updated;
}

export async function goOnline(driverId, lat, lng) {
  const [driver] = await db.select({
    subscriptionStatus: drivers.subscriptionStatus,
    approvalStatus:     drivers.approvalStatus,
    isBlocked:          drivers.isBlocked,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  if (!driver)                              throw { statusCode: 404, message: 'Driver not found' };
  if (driver.isBlocked)                     throw { statusCode: 403, message: 'Account is blocked' };
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
  if (filters.registrationStatus) conditions.push(eq(drivers.registrationStatus, filters.registrationStatus));
  if (filters.countryId) conditions.push(eq(drivers.countryId, filters.countryId));
  if (filters.cityId) conditions.push(eq(drivers.cityId, filters.cityId));
  if (filters.isBlocked !== undefined) conditions.push(eq(drivers.isBlocked, filters.isBlocked));

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(drivers).where(where);
  const rows = await db.select().from(drivers).where(where)
    .orderBy(desc(drivers.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getDriverDetail(driverId) {
  return getRegistrationSummary(driverId);
}

export async function approveDriver(driverId, adminId, note) {
  const [driver] = await db.update(drivers).set({
    approvalStatus: 'approved', registrationStatus: 'approved',
    approvedBy: adminId, approvedAt: new Date(), approvalNote: note,
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
    approvalStatus: 'rejected', registrationStatus: 'rejected',
    approvedBy: adminId, approvalNote: note,
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Application Rejected', body: note || 'Please contact support.',
    type: 'ACCOUNT_REJECTED',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_REJECTED', entityType: 'driver', entityId: driverId,
  });
  return driver;
}

export async function requestMoreDocuments(driverId, adminId, documentTypeCodes, note) {
  const [driver] = await db.update(drivers).set({
    registrationStatus: 'documents_pending', updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Additional documents needed',
    body: note || `Please upload: ${documentTypeCodes.join(', ')}`,
    type: 'DOCUMENTS_REQUESTED',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DOCUMENTS_REQUESTED', entityType: 'driver', entityId: driverId,
    meta: { documentTypeCodes, note },
  });
  return driver;
}

export async function blockDriver(driverId, adminId) {
  await db.update(drivers).set({ isBlocked: true, isOnline: false, registrationStatus: 'suspended' })
    .where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_BLOCKED', entityType: 'driver', entityId: driverId,
  });
  return { blocked: true };
}

export async function unblockDriver(driverId, adminId) {
  await db.update(drivers).set({ isBlocked: false, registrationStatus: 'active' })
    .where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_UNBLOCKED', entityType: 'driver', entityId: driverId,
  });
  return { blocked: false };
}
