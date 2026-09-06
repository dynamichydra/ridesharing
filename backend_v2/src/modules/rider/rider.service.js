import { eq, desc, count, and, or, ilike } from 'drizzle-orm';
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
  const [prefs] = await db.select().from(riderPreferences).where(eq(riderPreferences.riderId, riderId)).limit(1);

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
    discountPercentage: riderSubscriptionPlans.discountPercentage,
    maxDiscountMinor: riderSubscriptionPlans.maxDiscountMinor,
    freeRidesPerMonth: riderSubscriptionPlans.freeRidesPerMonth,
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
  };
}

export async function getProfile(riderId) {
  const [user] = await db.select().from(users).where(eq(users.id, riderId)).limit(1);
  if (!user) throw { statusCode: 404, message: 'User not found' };
  return user;
}

export async function updateProfile(riderId, data) {
  const allowed = ['name', 'email', 'avatar', 'fcmToken'];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  updates.updatedAt = new Date();
  const [updated] = await db.update(users).set(updates).where(eq(users.id, riderId)).returning();
  return updated;
}

export async function getRideHistory(riderId, page, limit, offset, status = null) {
  const conditions = [eq(rides.riderId, riderId)];
  if (status) {
    conditions.push(eq(rides.status, status));
  }
  const whereClause = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(rides).where(whereClause);
  const rows = await db.select().from(rides).where(whereClause)
    .orderBy(desc(rides.requestedAt)).limit(limit).offset(offset);
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

