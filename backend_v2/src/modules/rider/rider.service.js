import { eq, desc, count, and, or, ilike, ne } from 'drizzle-orm';
import { invalidateAccountStatus } from '../../middleware/authenticate.js';
import { db } from '../../config/db.js';
import {
  users,
  rides,
  countries,
  states,
  cities,
  wallets,
  riderPreferences,
  riderSubscriptions,
  riderSubscriptionPlans,
  savedPlaces,
  vehicleTypes,
  drivers,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function getRiderMe(riderId) {
  const [user] = await db.select().from(users).where(eq(users.id, riderId)).limit(1);
  if (!user) throw { statusCode: 404, message: 'User not found' };

  let country = null;
  let state = null;
  let city = null;

  if (user.countryId) {
    const [c] = await db.select().from(countries).where(eq(countries.id, user.countryId)).limit(1);
    country = c || null;
  }
  if (user.stateId) {
    const [s] = await db.select().from(states).where(eq(states.id, user.stateId)).limit(1);
    state = s || null;
  }
  if (user.cityId) {
    const [ct] = await db.select().from(cities).where(eq(cities.id, user.cityId)).limit(1);
    city = ct || null;
  }

  // Preferences
  const [prefs] = await db.select().from(riderPreferences).where(eq(riderPreferences.userId, riderId)).limit(1);

  // Active Rider Subscription
  const [activeSub] = await db.select({
    id: riderSubscriptions.id,
    planId: riderSubscriptions.planId,
    status: riderSubscriptions.status,
    startDate: riderSubscriptions.startDate,
    endDate: riderSubscriptions.endDate,
    amountMinor: riderSubscriptions.amountMinor,
    currencyCode: riderSubscriptions.currencyCode,
    planName: riderSubscriptionPlans.name,
    planType: riderSubscriptionPlans.type,
    priceMinor: riderSubscriptionPlans.priceMinor,
    features: riderSubscriptionPlans.features,
  }).from(riderSubscriptions)
    .innerJoin(riderSubscriptionPlans, eq(riderSubscriptions.planId, riderSubscriptionPlans.id))
    .where(
      and(
        eq(riderSubscriptions.riderId, riderId),
        eq(riderSubscriptions.status, 'active'),
      )
    ).limit(1);

  // Wallet
  const [wallet] = await db.select().from(wallets).where(eq(wallets.riderId, riderId)).limit(1);

  // Saved Places
  const places = await db.select().from(savedPlaces).where(eq(savedPlaces.userId, riderId));

  // Payment Methods
  const { listPaymentMethods } = await import('../payment-method/payment-method.service.js');
  const { annotateSavedMethodsForProfile } = await import('../payment/payment-region.service.js');
  const annotatedMethods = annotateSavedMethodsForProfile(await listPaymentMethods(riderId, 'rider'));

  return {
    ...user,
    userType: 'rider',
    role: 'rider',
    country,
    state,
    city,
    preferences: prefs || null,
    activeSubscription: activeSub || null,
    wallet: wallet ? {
      id: wallet.id,
      balanceMinor: wallet.balanceMinor,
      currencyCode: wallet.currencyCode,
      status: wallet.status,
    } : null,
    savedPlaces: places || [],
    payment_methods: annotatedMethods || [],
  };
}

/**
 * What the rider app keeps locally (name, email, country, currency) — re-fetched on every app
 * open so the local copy is always the server's. Rejects blocked accounts, and accounts being
 * used outside their home country (regionCountry = the verified X-Region-Token country; null
 * when the region lock is off for local development).
 */
export async function getRiderSession(riderId, regionCountry = null) {
  const [user] = await db.select().from(users).where(eq(users.id, riderId)).limit(1);
  if (!user) throw { statusCode: 401, code: 'ACCOUNT_NOT_FOUND', message: 'Account not found. Please log in again.' };
  if (user.isBlocked || user.status === 'suspended' || user.status === 'deleted') {
    throw { statusCode: 403, code: 'ACCOUNT_BLOCKED', message: 'This account has been suspended. Please contact support.' };
  }

  let country = null;
  if (user.countryId) {
    [country] = await db.select().from(countries).where(eq(countries.id, user.countryId)).limit(1);
  }
  if (regionCountry && country && country.isoCode.toUpperCase() !== regionCountry) {
    const { accountCountryMismatchMessage } = await import('../auth/rider-region.service.js');
    throw {
      statusCode: 403,
      code: 'ACCOUNT_COUNTRY_MISMATCH',
      message: accountCountryMismatchMessage(country.isoCode.toUpperCase(), regionCountry),
    };
  }

  const { paymentProfileForCountry } = await import('./rider-payment-profile.js');
  const { listPaymentMethods } = await import('../payment-method/payment-method.service.js');
  const profile = paymentProfileForCountry(country?.isoCode);
  if (!profile) {
    // Accounts from before country assignment: a fresh login (verify-OTP) pins the country
    // from the verified location, so send the rider back through it.
    throw { statusCode: 401, code: 'ACCOUNT_COUNTRY_MISSING', message: 'Please log in again to continue.' };
  }
  const savedCards = profile ? await listPaymentMethods(riderId, 'rider') : [];

  return {
    id: user.id,
    name: user.name || '',
    email: user.email || '',
    phone: user.phone,
    countryCode: country?.isoCode?.toUpperCase() ?? null,
    countryName: country?.name ?? null,
    dialCode: country?.dialCode ?? null,
    // Fixed by the account's country (rider-payment-profile.js) — the app must not derive these.
    currencyCode: profile?.currencyCode ?? null,
    currencySymbol: profile?.currencySymbol ?? null,
    paymentGateway: profile?.gateway ?? null,
    savedPaymentMethods: savedCards
      .filter((m) => m.gateway === profile?.gateway)
      .map((m) => ({
        id: m.id,
        gateway: m.gateway,
        cardBrand: m.cardBrand,
        last4: m.last4,
        expiryMonth: m.expiryMonth,
        expiryYear: m.expiryYear,
        isDefault: !!m.isDefault,
      })),
    profileComplete: Boolean(user.name && user.email),
  };
}

export async function getProfile(riderId) {
  const [user] = await db.select().from(users).where(eq(users.id, riderId)).limit(1);
  if (!user) throw { statusCode: 404, message: 'User not found' };
  return user;
}

export async function updateProfile(riderId, data) {
  if (data.profilePhoto && !data.avatar) {
    data.avatar = data.profilePhoto;
  }
  // currencyCode is not rider-editable — it's set from the rider's country at signup.
  const allowed = ['name', 'email', 'avatar', 'fcmToken'];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  if (updates.email) {
    const cleanEmail = String(updates.email).trim().toLowerCase();
    const [existing] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.email, cleanEmail), ne(users.id, riderId))).limit(1);
    if (existing) {
      throw { statusCode: 409, code: 'EMAIL_ALREADY_EXISTS', message: 'This email address is already registered. Please use another email or log in.' };
    }
    updates.email = cleanEmail;
  }

  updates.updatedAt = new Date();
  const [updated] = await db.update(users).set(updates).where(eq(users.id, riderId)).returning();
  if ('isBlocked' in updates) await invalidateAccountStatus('rider', riderId);
  return updated;
}

export async function getRideHistory(riderId, page, limit, offset, status = null) {
  const conditions = [eq(rides.riderId, riderId)];
  if (status) {
    conditions.push(eq(rides.status, status));
  }
  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(rides).where(whereClause);
  const rows = await db.select({
    id: rides.id,
    riderId: rides.riderId,
    driverId: rides.driverId,
    vehicleTypeId: rides.vehicleTypeId,
    countryId: rides.countryId,
    currencyCode: rides.currencyCode,
    pickupLat: rides.pickupLat,
    pickupLng: rides.pickupLng,
    pickupAddress: rides.pickupAddress,
    dropLat: rides.dropLat,
    dropLng: rides.dropLng,
    dropAddress: rides.dropAddress,
    fareSnapshot: rides.fareSnapshot,
    estimatedFareMinor: rides.estimatedFareMinor,
    finalFareMinor: rides.finalFareMinor,
    distanceKm: rides.distanceKm,
    durationMin: rides.durationMin,
    actualDistanceKm: rides.actualDistanceKm,
    actualDurationMin: rides.actualDurationMin,
    status: rides.status,
    isScheduled: rides.isScheduled,
    scheduledAt: rides.scheduledAt,
    paymentMethod: rides.paymentMethod,
    paymentStatus: rides.paymentStatus,
    requestedAt: rides.requestedAt,
    acceptedAt: rides.acceptedAt,
    startedAt: rides.startedAt,
    completedAt: rides.completedAt,
    cancelledAt: rides.cancelledAt,
    vehicleTypeName: vehicleTypes.name,
    vehicleTypeSlug: vehicleTypes.slug,
    vehicleTypeIcon: vehicleTypes.icon,
    driverName: drivers.name,
    driverPhone: drivers.phone,
    driverRating: drivers.rating,
    driverPhoto: drivers.profilePhoto,
    vehicleNumber: drivers.vehicleNumber,
    vehicleModel: drivers.vehicleModel,
  })
    .from(rides)
    .leftJoin(vehicleTypes, eq(rides.vehicleTypeId, vehicleTypes.id))
    .leftJoin(drivers, eq(rides.driverId, drivers.id))
    .where(whereClause)
    .orderBy(desc(rides.requestedAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function updateFcmToken(riderId, fcmToken) {
  await db.update(users).set({ fcmToken }).where(eq(users.id, riderId));
  return { updated: true };
}

// ── Admin-facing Rider Functions ─────────────────────────────────────────────

export async function listRiders(filters = {}, page, limit, offset) {
  const conditions = [];
  if (filters.isVerified !== undefined) conditions.push(eq(users.isVerified, filters.isVerified));
  if (filters.isBlocked !== undefined) conditions.push(eq(users.isBlocked, filters.isBlocked));
  if (filters.countryId) conditions.push(eq(users.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(users.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(users.cityId, filters.cityId));
  if (filters.search) {
    conditions.push(
      or(
        ilike(users.name, `%${filters.search}%`),
        ilike(users.email, `%${filters.search}%`),
        ilike(users.phone, `%${filters.search}%`)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(users).where(where);
  const rows = await db.select().from(users).where(where)
    .orderBy(desc(users.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function adminCreateRider(data) {
  const [created] = await db.insert(users).values({
    phone: data.phone,
    name: data.name,
    email: data.email,
    avatar: data.avatar || null,
    isVerified: data.isVerified ?? false,
    isBlocked: data.isBlocked ?? false,
    countryId: data.countryId || null,
    stateId: data.stateId || null,
    cityId: data.cityId || null,
  }).returning();
  return created;
}

export async function adminUpdateRider(riderId, data) {
  const allowed = ['name', 'email', 'phone', 'avatar', 'isVerified', 'isBlocked', 'countryId', 'stateId', 'cityId'];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  updates.updatedAt = new Date();
  const [updated] = await db.update(users).set(updates).where(eq(users.id, riderId)).returning();
  return updated;
}

// Thin aggregate for the admin detail page — rides/payments/wallet/subscription stay
// separate paginated calls (same division the driver detail page uses).
export async function getRiderDetail(riderId) {
  const [rider] = await db.select().from(users).where(eq(users.id, riderId)).limit(1);
  if (!rider) throw { statusCode: 404, message: 'Rider not found' };

  const [{ totalRides }] = await db.select({ totalRides: count() }).from(rides).where(eq(rides.riderId, riderId));
  const [{ completedRides }] = await db.select({ completedRides: count() }).from(rides)
    .where(and(eq(rides.riderId, riderId), eq(rides.status, 'completed')));
  const [{ cancelledRides }] = await db.select({ cancelledRides: count() }).from(rides)
    .where(and(eq(rides.riderId, riderId), eq(rides.status, 'cancelled')));

  return { rider, rideStats: { totalRides, completedRides, cancelledRides } };
}

