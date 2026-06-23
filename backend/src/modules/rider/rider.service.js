import { eq, desc, count } from 'drizzle-orm';
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
