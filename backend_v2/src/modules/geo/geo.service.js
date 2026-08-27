import { eq, and, asc, count, ilike } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { countries, states, cities, cityTypes } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

// ── Countries ────────────────────────────────────────────────────────────────

export async function listCountries(onlyActive = true) {
  const where = onlyActive ? eq(countries.isActive, true) : undefined;
  return db.select().from(countries).where(where).orderBy(asc(countries.sortOrder));
}

export async function listCountriesPaginated(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(countries);
  const rows = await db.select().from(countries).orderBy(asc(countries.sortOrder)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function createCountry(data) {
  const [row] = await db.insert(countries).values(data).returning();
  return row;
}

export async function updateCountry(id, data) {
  data.updatedAt = new Date();
  const [row] = await db.update(countries).set(data).where(eq(countries.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Country not found' };
  return row;
}

export async function setCountryActive(id, isActive) {
  const [row] = await db.update(countries).set({ isActive, updatedAt: new Date() })
    .where(eq(countries.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'Country not found' };
  return row;
}

export async function getCountryById(id) {
  const [row] = await db.select().from(countries).where(eq(countries.id, id)).limit(1);
  if (!row) throw { statusCode: 404, message: 'Country not found' };
  return row;
}

/**
 * Fallback country for pickup points that don't fall inside any drawn zone
 * (e.g. a market that hasn't finished zone setup yet). Every deployment must
 * have exactly one country flagged isDefault — admin-configurable, not hardcoded.
 */
export async function getDefaultCountry() {
  const [row] = await db.select().from(countries)
    .where(and(eq(countries.isDefault, true), eq(countries.isActive, true))).limit(1);
  if (row) return row;
  const [fallback] = await db.select().from(countries)
    .where(eq(countries.isActive, true)).orderBy(asc(countries.sortOrder)).limit(1);
  if (!fallback) throw { statusCode: 500, message: 'No active country configured' };
  return fallback;
}

// ── States ───────────────────────────────────────────────────────────────────

export async function listStates(countryId, onlyActive = true) {
  const conditions = [eq(states.countryId, countryId)];
  if (onlyActive) conditions.push(eq(states.isActive, true));
  return db.select().from(states).where(and(...conditions)).orderBy(asc(states.name));
}

export async function listStatesPaginated(countryId, page, limit, offset) {
  const where = countryId ? eq(states.countryId, countryId) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(states).where(where);
  const rows = await db.select().from(states).where(where).orderBy(asc(states.name)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function createState(data) {
  const [row] = await db.insert(states).values(data).returning();
  return row;
}

export async function updateState(id, data) {
  data.updatedAt = new Date();
  const [row] = await db.update(states).set(data).where(eq(states.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'State not found' };
  return row;
}

export async function setStateActive(id, isActive) {
  const [row] = await db.update(states).set({ isActive }).where(eq(states.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'State not found' };
  return row;
}

// ── Cities ───────────────────────────────────────────────────────────────────

export async function listCities(stateId, onlyActive = true) {
  const conditions = [eq(cities.stateId, stateId)];
  if (onlyActive) conditions.push(eq(cities.isActive, true));
  return db
    .select({
      city: cities,
      cityType: cityTypes,
    })
    .from(cities)
    .leftJoin(cityTypes, eq(cities.cityTypeId, cityTypes.id))
    .where(and(...conditions))
    .orderBy(asc(cities.sortOrder));
}

export async function listCitiesPaginated(filters, page, limit, offset) {
  const conditions = [];
  if (filters.countryId)  conditions.push(eq(cities.countryId, filters.countryId));
  if (filters.stateId)    conditions.push(eq(cities.stateId, filters.stateId));
  if (filters.cityTypeId) conditions.push(eq(cities.cityTypeId, filters.cityTypeId));
  if (filters.search)     conditions.push(ilike(cities.name, `%${filters.search}%`));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(cities).where(where);
  const rows = await db
    .select({
      city: cities,
      cityType: cityTypes,
    })
    .from(cities)
    .leftJoin(cityTypes, eq(cities.cityTypeId, cityTypes.id))
    .where(where)
    .orderBy(asc(cities.sortOrder), asc(cities.name))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getCityById(id) {
  const [row] = await db
    .select({
      city: cities,
      cityType: cityTypes,
    })
    .from(cities)
    .leftJoin(cityTypes, eq(cities.cityTypeId, cityTypes.id))
    .where(eq(cities.id, id))
    .limit(1);

  if (!row) throw { statusCode: 404, message: 'City not found' };
  return row;
}

export async function createCity(data, adminId) {
  const [row] = await db.insert(cities).values({ ...data, createdBy: adminId }).returning();
  return row;
}

export async function updateCity(id, data) {
  data.updatedAt = new Date();
  const [row] = await db.update(cities).set(data).where(eq(cities.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'City not found' };
  return row;
}

export async function setCityActive(id, isActive) {
  const [row] = await db.update(cities).set({ isActive, updatedAt: new Date() })
    .where(eq(cities.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'City not found' };
  return row;
}
