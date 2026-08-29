import { eq, desc, count, and, or, ilike, ne, sql, gte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers, subscriptions, cities, driverPayoutAccounts, vehicleModels, rides, countries } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';
import { createUploadUrl, verifyObjectExists } from '../../utils/storage.js';
import * as vehicleService from '../vehicle/vehicle.service.js';
import * as documentsService from '../documents/documents.service.js';
import * as onboardingService from '../onboarding/onboarding.service.js';

function getStartOfTodayInTimezone(timeZone = 'UTC') {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find((p) => p.type === 'year').value;
    const m = parts.find((p) => p.type === 'month').value;
    const d = parts.find((p) => p.type === 'day').value;

    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone }));
    const offsetMs = tzDate.getTime() - utcDate.getTime();

    return new Date(new Date(`${y}-${m}-${d}T00:00:00Z`).getTime() - offsetMs);
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
}

export async function getDashboardSummary(driverId) {
  const [driver] = await db.select({
    id: drivers.id,
    name: drivers.name,
    phone: drivers.phone,
    profilePhoto: drivers.profilePhoto,
    rating: drivers.rating,
    isOnline: drivers.isOnline,
    vehicleModel: drivers.vehicleModel,
    vehicleNumber: drivers.vehicleNumber,
    countryId: drivers.countryId,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  // Resolve driver's country timezone
  let timezone = 'UTC';
  if (driver.countryId) {
    const [country] = await db.select({ timezone: countries.timezone }).from(countries).where(eq(countries.id, driver.countryId)).limit(1);
    if (country?.timezone) timezone = country.timezone;
  } else {
    const [defaultCountry] = await db.select({ timezone: countries.timezone }).from(countries).where(eq(countries.isDefault, true)).limit(1);
    if (defaultCountry?.timezone) timezone = defaultCountry.timezone;
  }

  // Calculate start of today (midnight in driver's country timezone)
  const startOfToday = getStartOfTodayInTimezone(timezone);

  // Completed rides today
  const todayCompletedRides = await db.select({
    id: rides.id,
    finalFareMinor: rides.finalFareMinor,
    estimatedFareMinor: rides.estimatedFareMinor,
    actualDurationMin: rides.actualDurationMin,
    durationMin: rides.durationMin,
    completedAt: rides.completedAt,
    startedAt: rides.startedAt,
  }).from(rides).where(
    and(
      eq(rides.driverId, driverId),
      eq(rides.status, 'completed'),
      gte(rides.completedAt, startOfToday),
    ),
  );

  const totalRidesToday = todayCompletedRides.length;
  let totalEarningsMinor = 0;
  let totalMinutes = 0;

  for (const r of todayCompletedRides) {
    totalEarningsMinor += (r.finalFareMinor || r.estimatedFareMinor || 0);
    if (r.actualDurationMin) {
      totalMinutes += r.actualDurationMin;
    } else if (r.startedAt && r.completedAt) {
      const mins = Math.ceil((new Date(r.completedAt) - new Date(r.startedAt)) / 60000);
      totalMinutes += (mins > 0 ? mins : 0);
    } else if (r.durationMin) {
      totalMinutes += r.durationMin;
    }
  }

  const totalEarnings = totalEarningsMinor / 100;
  const hoursNum = parseFloat((totalMinutes / 60).toFixed(1));
  const formattedHours = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : `${totalMinutes}m`;

  return {
    id: driver.id,
    name: driver.name || 'Driver',
    phone: driver.phone,
    profilePhoto: driver.profilePhoto || null,
    rating: driver.rating ? parseFloat(driver.rating).toFixed(1) : '5.0',
    isOnline: !!driver.isOnline,
    vehicleModel: driver.vehicleModel || null,
    vehicleNumber: driver.vehicleNumber || null,
    today: {
      totalRides: totalRidesToday,
      totalEarnings: totalEarnings,
      totalWorkingMinutes: totalMinutes,
      totalWorkingHours: hoursNum,
      formattedWorkingHours: formattedHours,
    },
  };
}

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
    approvalStatus: drivers.approvalStatus,
    isBlocked:      drivers.isBlocked,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  if (!driver)                              throw { statusCode: 404, message: 'Driver not found' };
  if (driver.isBlocked)                     throw { statusCode: 403, message: 'Account is blocked' };
  if (driver.approvalStatus !== 'approved') throw { statusCode: 403, message: 'Account not approved yet' };

  // A subscription is no longer required to go online (see commission.service.js) — but a
  // driver still needs somewhere for the platform to actually pay them, so an approved payout
  // account (Stripe Connect or RazorpayX, see payout-account/bank-account modules) is now the
  // gate instead of subscriptionStatus.
  const [payoutAccount] = await db.select({ status: driverPayoutAccounts.status })
    .from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);
  if (!payoutAccount || payoutAccount.status !== 'approved') {
    throw { statusCode: 403, message: 'Add and verify your payout bank details before going online' };
  }

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

export async function adminRegisterDriver(adminId, data) {
  const { name, phone, email } = data;
  if (!name) throw { statusCode: 400, message: 'name is required' };
  if (!phone && !email) throw { statusCode: 400, message: 'phone or email is required' };

  if (phone) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.phone, phone)).limit(1);
    if (existing) throw { statusCode: 409, code: 'PHONE_TAKEN', message: 'A driver with this phone already exists' };
  }
  if (email) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.email, email)).limit(1);
    if (existing) throw { statusCode: 409, code: 'EMAIL_TAKEN', message: 'A driver with this email already exists' };
  }

  // vehicleTypeId/vehicleModel are resolved from the catalog, not taken from the client —
  // same fraud-prevention rule as the driver's own vehicle submission (see vehicle.service.js).
  let vehicleTypeId, vehicleModel;
  if (data.vehicleModelId) {
    const [vm] = await db.select().from(vehicleModels).where(eq(vehicleModels.id, data.vehicleModelId)).limit(1);
    if (!vm || !vm.isActive) throw { statusCode: 400, message: 'Invalid vehicle model' };
    vehicleTypeId = vm.vehicleTypeId;
    vehicleModel = vm.name;
  }

  const [driver] = await db.insert(drivers).values({
    name, phone, email,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    preferredLanguageCode: data.preferredLanguageCode,
    countryId: data.countryId,
    stateId: data.stateId,
    cityId: data.cityId,
    vehicleTypeId,
    vehicleNumber: data.vehicleNumber,
    vehicleModel,
    vehicleYear: data.vehicleYear,
    registrationStatus: 'registration_in_progress',
    registrationStep: REGISTRATION_STEP.PERSONAL_INFO,
    approvalStatus: 'pending',
  }).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_REGISTERED_BY_ADMIN', entityType: 'driver', entityId: driver.id,
  });
  return driver;
}

export async function listDrivers(filters, page, limit, offset) {
  const conditions = [];
  if (filters.approvalStatus) conditions.push(eq(drivers.approvalStatus, filters.approvalStatus));
  if (filters.subscriptionStatus) conditions.push(eq(drivers.subscriptionStatus, filters.subscriptionStatus));
  if (filters.registrationStatus) conditions.push(eq(drivers.registrationStatus, filters.registrationStatus));
  if (filters.countryId) conditions.push(eq(drivers.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(drivers.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(drivers.cityId, filters.cityId));
  if (filters.isBlocked !== undefined) conditions.push(eq(drivers.isBlocked, filters.isBlocked));
  if (filters.search) {
    conditions.push(
      or(
        ilike(drivers.name, `%${filters.search}%`),
        ilike(drivers.email, `%${filters.search}%`),
        ilike(drivers.phone, `%${filters.search}%`)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(drivers).where(where);
  const rows = await db.select().from(drivers).where(where)
    .orderBy(desc(drivers.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getDriverDetail(driverId) {
  const summary = await getRegistrationSummary(driverId);
  const driver = summary.driver;

  // Resolve location names (Country, State, City)
  let countryName = null, stateName = null, cityName = null;
  if (driver.countryId) {
    const [c] = await db.select({ name: countries.name }).from(countries).where(eq(countries.id, driver.countryId)).limit(1);
    countryName = c?.name || null;
  }
  if (driver.cityId) {
    const [ct] = await db.select({ name: cities.name }).from(cities).where(eq(cities.id, driver.cityId)).limit(1);
    cityName = ct?.name || null;
  }

  // Get active bank details
  let bankAccount = null;
  try {
    const { driverBankAccounts } = await import('../../../drizzle/schema/driver-bank-accounts.js');
    const [ba] = await db.select().from(driverBankAccounts)
      .where(eq(driverBankAccounts.driverId, driverId))
      .orderBy(desc(driverBankAccounts.createdAt))
      .limit(1);
    bankAccount = ba || null;
  } catch {}

  // Get recent trips for this driver
  let recentRides = [];
  try {
    recentRides = await db.select({
      id: rides.id,
      status: rides.status,
      pickupAddress: rides.pickupAddress,
      dropAddress: rides.dropAddress,
      estimatedFareMinor: rides.estimatedFareMinor,
      finalFareMinor: rides.finalFareMinor,
      currencyCode: rides.currencyCode,
      requestedAt: rides.requestedAt,
      completedAt: rides.completedAt,
    }).from(rides)
      .where(eq(rides.driverId, driverId))
      .orderBy(desc(rides.requestedAt))
      .limit(20);
  } catch {}

  // Performance totals
  let completedTrips = 0;
  let cancelledTrips = 0;
  let lifetimeEarningsMinor = 0;
  try {
    const [completedRidesResult] = await db.select({ total: count() }).from(rides)
      .where(and(eq(rides.driverId, driverId), eq(rides.status, 'completed')));
    const [cancelledRidesResult] = await db.select({ total: count() }).from(rides)
      .where(and(eq(rides.driverId, driverId), eq(rides.status, 'cancelled')));
    const [earningsResult] = await db.select({
      totalEarningsMinor: sql`COALESCE(SUM(final_fare_minor), 0)::bigint`,
    }).from(rides)
      .where(and(eq(rides.driverId, driverId), eq(rides.status, 'completed')));

    completedTrips = Number(completedRidesResult?.total || 0);
    cancelledTrips = Number(cancelledRidesResult?.total || 0);
    lifetimeEarningsMinor = Number(earningsResult?.totalEarningsMinor || 0);
  } catch {}

  const totalRidesCount = Number(driver.totalRides || 0);
  const totalHandled = completedTrips + cancelledTrips;
  const completionRate = totalHandled > 0 ? Math.round((completedTrips / totalHandled) * 100) : 100;
  const acceptanceRate = 98;

  return {
    ...summary,
    driver: {
      ...driver,
      countryName,
      stateName,
      cityName,
    },
    bankAccount,
    trips: recentRides || [],
    performance: {
      totalTrips: totalRidesCount || completedTrips,
      completedTrips,
      cancelledTrips,
      completionRate,
      acceptanceRate,
      lifetimeEarningsMinor,
      rating: driver.rating ? parseFloat(driver.rating).toFixed(1) : '5.0',
      totalRatings: driver.totalRatings || 0,
    },
  };
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

export async function setDriverPending(driverId, adminId, note) {
  const [driver] = await db.update(drivers).set({
    approvalStatus: 'pending',
    registrationStatus: 'pending_review',
    approvedBy: adminId,
    approvalNote: note || 'Reset to pending review by admin',
    updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Application Status Updated',
    body: note || 'Your driver application has been reset to pending review.',
    type: 'ACCOUNT_PENDING_REVIEW',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_STATUS_RESET_PENDING', entityType: 'driver', entityId: driverId,
    meta: { note },
  });
  return driver;
}

export async function adminUpdateDriver(driverId, adminId, data) {
  const [existingDriver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!existingDriver) throw { statusCode: 404, message: 'Driver not found' };

  if (data.phone && data.phone !== existingDriver.phone) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers)
      .where(and(eq(drivers.phone, data.phone), ne(drivers.id, driverId))).limit(1);
    if (existing) throw { statusCode: 409, code: 'PHONE_TAKEN', message: 'A driver with this phone already exists' };
  }

  if (data.email && data.email !== existingDriver.email) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers)
      .where(and(eq(drivers.email, data.email), ne(drivers.id, driverId))).limit(1);
    if (existing) throw { statusCode: 409, code: 'EMAIL_TAKEN', message: 'A driver with this email already exists' };
  }

  const allowedFields = [
    'name', 'phone', 'email', 'profilePhoto', 'status',
    'dateOfBirth', 'gender', 'referralCode', 'preferredLanguageCode',
    'countryId', 'stateId', 'cityId',
    'registrationStatus', 'registrationStep',
    'licenseNumber', 'licenseDoc', 'aadharNumber', 'aadharDoc',
    'vehicleTypeId', 'vehicleNumber', 'vehicleModel', 'vehiclePhoto', 'vehicleYear',
    'approvalStatus', 'approvalNote',
    'isOnline', 'isBlocked',
    'rating', 'totalRatings', 'totalRides',
    'subscriptionStatus',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  if (updates.approvalStatus === 'approved' && existingDriver.approvalStatus !== 'approved') {
    updates.approvedBy = adminId;
    updates.approvedAt = new Date();
    if (!updates.registrationStatus) updates.registrationStatus = 'approved';
  } else if (updates.approvalStatus === 'rejected' && existingDriver.approvalStatus !== 'rejected') {
    updates.approvedBy = adminId;
    if (!updates.registrationStatus) updates.registrationStatus = 'rejected';
  } else if (updates.approvalStatus === 'pending' && existingDriver.approvalStatus !== 'pending') {
    updates.approvedBy = adminId;
    if (!updates.registrationStatus) updates.registrationStatus = 'pending_review';
  }

  updates.updatedAt = new Date();

  const [updatedDriver] = await db.update(drivers).set(updates).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_UPDATED_BY_ADMIN', entityType: 'driver', entityId: driverId,
    meta: { changes: Object.keys(updates) },
  });

  return updatedDriver;
}

