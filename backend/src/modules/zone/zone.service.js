import { eq, and, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { zones } from '../../../drizzle/schema/index.js';
import { isPointInPolygon } from '../../utils/geo.js';
import { paginate } from '../../utils/response.js';

export async function listAll(countryId) {
  const conditions = [eq(zones.isActive, true)];
  if (countryId) conditions.push(eq(zones.countryId, countryId));
  return db.select().from(zones).where(and(...conditions));
}

export async function listPaginated(page, limit, offset, countryId) {
  const where = countryId ? eq(zones.countryId, countryId) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(zones).where(where);
  const rows = await db.select().from(zones).where(where).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [zone] = await db.select().from(zones).where(eq(zones.id, id)).limit(1);
  if (!zone) throw { statusCode: 404, message: 'Zone not found' };
  return zone;
}

export async function detectZone(lat, lng) {
  const allZones = await db.select().from(zones).where(eq(zones.isActive, true));
  return allZones.find(z => isPointInPolygon(lat, lng, z.polygon.coordinates)) || null;
}

export async function create(data) {
  const [zone] = await db.insert(zones).values(data).returning();
  return zone;
}

export async function update(id, data) {
  data.updatedAt = new Date();
  const [zone] = await db.update(zones).set(data).where(eq(zones.id, id)).returning();
  if (!zone) throw { statusCode: 404, message: 'Zone not found' };
  return zone;
}

export async function remove(id) {
  const [zone] = await db.update(zones).set({ isActive: false }).where(eq(zones.id, id)).returning();
  if (!zone) throw { statusCode: 404, message: 'Zone not found' };
  return { deleted: true };
}
