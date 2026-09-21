import { eq, and, or, isNull, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { taxRules } from '../../../drizzle/schema/tax-rules.js';
import { countries } from '../../../drizzle/schema/countries.js';
import { states } from '../../../drizzle/schema/states.js';
import { cities } from '../../../drizzle/schema/cities.js';
import { paginate } from '../../utils/response.js';

export async function listPaginated(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.countryId) conditions.push(eq(taxRules.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(taxRules.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(taxRules.cityId, filters.cityId));
  if (filters.isActive !== undefined) conditions.push(eq(taxRules.isActive, filters.isActive));
  if (filters.appliesTo) conditions.push(eq(taxRules.appliesTo, filters.appliesTo));

  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(taxRules).where(where);
  const rows = await db
    .select({
      id: taxRules.id,
      countryId: taxRules.countryId,
      stateId: taxRules.stateId,
      cityId: taxRules.cityId,
      name: taxRules.name,
      appliesTo: taxRules.appliesTo,
      rate: taxRules.rate,
      isInclusive: taxRules.isInclusive,
      isActive: taxRules.isActive,
      createdAt: taxRules.createdAt,
      updatedAt: taxRules.updatedAt,
      countryName: countries.name,
      stateName: states.name,
      cityName: cities.name,
    })
    .from(taxRules)
    .leftJoin(countries, eq(taxRules.countryId, countries.id))
    .leftJoin(states, eq(taxRules.stateId, states.id))
    .leftJoin(cities, eq(taxRules.cityId, cities.id))
    .where(where)
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function create(data) {
  const [row] = await db.insert(taxRules).values(data).returning();
  return row;
}

export async function update(id, data) {
  data.updatedAt = new Date();
  const [row] = await db.update(taxRules).set(data).where(eq(taxRules.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Tax rule not found' };
  return row;
}

export async function remove(id) {
  const [row] = await db.update(taxRules)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(taxRules.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Tax rule not found' };
  return { deleted: true };
}

/**
 * Resolves active tax rules using a 3-tier geographic waterfall:
 * 1. City-specific tax rules (if cityId provided and matching active rules exist)
 * 2. State-level tax rules (if stateId provided and matching active rules exist with cityId null)
 * 3. Country-wide tax rules fallback (where cityId and stateId are null)
 */
export async function getApplicableTaxRules(countryId, appliesTo, { stateId = null, cityId = null } = {}) {
  // 1. Check City-specific tax rules
  if (cityId) {
    const cityRules = await db.select().from(taxRules).where(and(
      eq(taxRules.cityId, cityId),
      eq(taxRules.isActive, true),
      or(eq(taxRules.appliesTo, appliesTo), eq(taxRules.appliesTo, 'both')),
    ));
    if (cityRules.length > 0) return cityRules;
  }

  // 2. Check State-level tax rules
  if (stateId) {
    const stateRules = await db.select().from(taxRules).where(and(
      eq(taxRules.stateId, stateId),
      isNull(taxRules.cityId),
      eq(taxRules.isActive, true),
      or(eq(taxRules.appliesTo, appliesTo), eq(taxRules.appliesTo, 'both')),
    ));
    if (stateRules.length > 0) return stateRules;
  }

  // 3. Fallback to Country-wide tax rules
  if (countryId) {
    return db.select().from(taxRules).where(and(
      eq(taxRules.countryId, countryId),
      isNull(taxRules.cityId),
      isNull(taxRules.stateId),
      eq(taxRules.isActive, true),
      or(eq(taxRules.appliesTo, appliesTo), eq(taxRules.appliesTo, 'both')),
    ));
  }

  return [];
}
