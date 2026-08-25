import { eq, desc, count, and, or, ilike } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, rides } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

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

export async function getRideHistory(riderId, page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(rides).where(eq(rides.riderId, riderId));
  const rows = await db.select().from(rides).where(eq(rides.riderId, riderId))
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

