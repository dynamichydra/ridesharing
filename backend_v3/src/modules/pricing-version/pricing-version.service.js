import { eq, and, asc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { pricingVersions } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function listAll(onlyActive = true) {
  const where = onlyActive ? eq(pricingVersions.isActive, true) : undefined;
  return db.select().from(pricingVersions).where(where).orderBy(asc(pricingVersions.createdAt));
}

export async function listPaginated(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.vehicleTypeId && filters.vehicleTypeId !== 'none') {
    conditions.push(eq(pricingVersions.vehicleTypeId, filters.vehicleTypeId));
  }
  if (filters.countryId && filters.countryId !== 'none') {
    conditions.push(eq(pricingVersions.countryId, filters.countryId));
  }
  if (filters.cityId && filters.cityId !== 'none') {
    conditions.push(eq(pricingVersions.cityId, filters.cityId));
  }
  if (filters.zoneId && filters.zoneId !== 'none') {
    conditions.push(eq(pricingVersions.zoneId, filters.zoneId));
  }
  if (filters.isActive !== undefined && filters.isActive !== '' && filters.isActive !== 'none') {
    conditions.push(eq(pricingVersions.isActive, String(filters.isActive) === 'true'));
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(pricingVersions).where(where);
  const rows = await db.select().from(pricingVersions).where(where).orderBy(asc(pricingVersions.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [pv] = await db.select().from(pricingVersions).where(eq(pricingVersions.id, id)).limit(1);
  if (!pv) throw { statusCode: 404, message: 'Pricing version not found' };
  return pv;
}

export async function create(data) {
  const [pv] = await db.insert(pricingVersions).values(data).returning();
  return pv;
}

export async function update(id, data) {
  data.updatedAt = new Date();
  const [pv] = await db.update(pricingVersions).set(data).where(eq(pricingVersions.id, id)).returning();
  if (!pv) throw { statusCode: 404, message: 'Pricing version not found' };
  return pv;
}

export async function setActive(id, isActive) {
  const [pv] = await db.update(pricingVersions).set({ isActive, updatedAt: new Date() })
    .where(eq(pricingVersions.id, id)).returning();
  if (!pv) throw { statusCode: 404, message: 'Pricing version not found' };
  return pv;
}
