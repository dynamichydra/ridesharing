import { eq, and, asc, count, ilike } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { countries, states, cities, cityTypes } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { polygonToHexCells, DEFAULT_RESOLUTION } from '../../utils/h3.js';

function normalizeGeoJsonPolygon(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.type === 'Polygon' && Array.isArray(raw.coordinates)) {
    return raw;
  }
  if (raw.type === 'Feature' && raw.geometry) {
    return normalizeGeoJsonPolygon(raw.geometry);
  }
  if (raw.type === 'FeatureCollection' && Array.isArray(raw.features) && raw.features.length > 0) {
    for (const f of raw.features) {
      const extracted = normalizeGeoJsonPolygon(f);
      if (extracted) return extracted;
    }
  }
  if (raw.type === 'MultiPolygon' && Array.isArray(raw.coordinates) && raw.coordinates.length > 0) {
    return { type: 'Polygon', coordinates: raw.coordinates[0] };
  }
  return raw;
}

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

// ── Cities (Direct Service Area Boundaries) ──────────────────────────────────

export async function listCities(stateId, onlyActive = true) {
  const conditions = [];
  if (stateId) conditions.push(eq(cities.stateId, stateId));
  if (onlyActive) conditions.push(eq(cities.isActive, true));
  const rows = await db
    .select({
      city: cities,
      cityType: cityTypes,
    })
    .from(cities)
    .leftJoin(cityTypes, eq(cities.cityTypeId, cityTypes.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(cities.sortOrder));

  return rows.map((r) => ({
    ...r.city,
    cityType: r.cityType || null,
  }));
}

export async function listCitiesPaginated(filters, page, limit, offset) {
  const conditions = [];
  if (filters.countryId)  conditions.push(eq(cities.countryId, filters.countryId));
  if (filters.stateId)    conditions.push(eq(cities.stateId, filters.stateId));
  if (filters.cityTypeId) conditions.push(eq(cities.cityTypeId, filters.cityTypeId));
  if (filters.status)     conditions.push(eq(cities.status, filters.status));
  if (filters.isActive !== undefined && filters.isActive !== '') {
    conditions.push(eq(cities.isActive, String(filters.isActive) === 'true'));
  }
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

  const flattenedRows = rows.map((r) => ({
    ...r.city,
    cityType: r.cityType || null,
  }));

  return { rows: flattenedRows, pagination: paginate(page, limit, total) };
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
  return { ...row.city, cityType: row.cityType || null };
}

export async function createCity(data, adminId) {
  let hexCells = null;
  const resolution = data.resolution || DEFAULT_RESOLUTION;
  let polygon = data.polygon ? normalizeGeoJsonPolygon(data.polygon) : null;

  if (polygon) {
    try {
      hexCells = polygonToHexCells(polygon, resolution);
      if (Array.isArray(hexCells) && hexCells.length > 10000) {
        hexCells = hexCells.slice(0, 10000);
      }
    } catch (err) {
      console.warn('H3 hex generation warning for city:', err?.message);
    }
  }

  const [row] = await db.insert(cities).values({
    ...data,
    polygon,
    hexCells,
    resolution,
    status: data.status || 'ACTIVE',
    createdBy: adminId || null,
  }).returning();

  return row;
}

export async function updateCity(id, data) {
  data.updatedAt = new Date();

  if (data.polygon) {
    const resolution = data.resolution || DEFAULT_RESOLUTION;
    const polygon = normalizeGeoJsonPolygon(data.polygon);
    data.polygon = polygon;
    try {
      const hexCells = polygonToHexCells(polygon, resolution);
      data.hexCells = Array.isArray(hexCells) && hexCells.length > 10000 ? hexCells.slice(0, 10000) : hexCells;
    } catch (err) {
      console.warn('H3 hex generation warning for city update:', err?.message);
    }
    data.resolution = resolution;
  }

  const [row] = await db.update(cities).set(data).where(eq(cities.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'City not found' };
  return row;
}

export async function setCityActive(id, isActive) {
  const [row] = await db.update(cities).set({
    isActive,
    status: isActive ? 'ACTIVE' : 'INACTIVE',
    updatedAt: new Date(),
  }).where(eq(cities.id, id)).returning();

  if (!row) throw { statusCode: 404, message: 'City not found' };
  return row;
}

export async function deleteCity(id) {
  const [row] = await db.delete(cities).where(eq(cities.id, id)).returning();
  if (!row) throw { statusCode: 404, message: 'City not found' };
  return row;
}
