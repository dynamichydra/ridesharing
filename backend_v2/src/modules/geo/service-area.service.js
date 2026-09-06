import { eq, and, count, desc, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cityServiceAreas, cities } from '../../../drizzle/schema/index.js';
import { isPointInPolygon } from '../../utils/geo.js';
import { polygonToHexCells, latLngToHexCell, DEFAULT_RESOLUTION } from '../../utils/h3.js';
import { paginate } from '../../utils/response.js';
import { redis } from '../../config/redis.js';

const SERVICE_AREA_REDIS_KEY = 'service_areas:active';

/**
 * Checks if a given coordinate is within an active service area.
 * Returns the matching service area and associated city or throws/returns invalid.
 */
export async function validateLocationInServiceArea(lat, lng) {
  const activeAreas = await db.select({
    id: cityServiceAreas.id,
    name: cityServiceAreas.name,
    cityId: cityServiceAreas.cityId,
    countryId: cityServiceAreas.countryId,
    status: cityServiceAreas.status,
    polygon: cityServiceAreas.polygon,
    cityName: cities.name,
    cityIsActive: cities.isActive,
    timezone: cities.timezone,
  })
  .from(cityServiceAreas)
  .leftJoin(cities, eq(cityServiceAreas.cityId, cities.id))
  .where(and(
    eq(cityServiceAreas.isActive, true),
    eq(cityServiceAreas.status, 'ACTIVE')
  ));

  // If no service areas are configured in DB yet (e.g. fresh deployment), allow fallback
  if (!activeAreas.length) {
    return { isAvailable: true, serviceArea: null, isFallback: true };
  }

  const matchingArea = activeAreas.find((area) => {
    if (!area.polygon || !area.polygon.coordinates) return false;
    return isPointInPolygon(lat, lng, area.polygon.coordinates);
  });

  if (!matchingArea) {
    return {
      isAvailable: false,
      reason: 'OUT_OF_SERVICE_AREA',
      message: 'Pickup location is outside our active service boundaries',
    };
  }

  if (matchingArea.cityIsActive === false) {
    return {
      isAvailable: false,
      reason: 'CITY_INACTIVE',
      message: `Service in ${matchingArea.cityName || 'this city'} is currently unavailable`,
    };
  }

  return {
    isAvailable: true,
    serviceArea: matchingArea,
    cityId: matchingArea.cityId,
    countryId: matchingArea.countryId,
    timezone: matchingArea.timezone,
  };
}

export async function listServiceAreas(cityId = null) {
  const conditions = [eq(cityServiceAreas.isActive, true)];
  if (cityId) conditions.push(eq(cityServiceAreas.cityId, cityId));
  return db
    .select({
      id: cityServiceAreas.id,
      cityId: cityServiceAreas.cityId,
      countryId: cityServiceAreas.countryId,
      name: cityServiceAreas.name,
      status: cityServiceAreas.status,
      polygon: cityServiceAreas.polygon,
      resolution: cityServiceAreas.resolution,
      isActive: cityServiceAreas.isActive,
      createdAt: cityServiceAreas.createdAt,
      updatedAt: cityServiceAreas.updatedAt,
      hexCount: sql`COALESCE(array_length(${cityServiceAreas.hexCells}, 1), 0)`.mapWith(Number),
      hexCells: cityServiceAreas.hexCells,
    })
    .from(cityServiceAreas)
    .where(and(...conditions));
}

export async function listServiceAreasPaginated(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.cityId) conditions.push(eq(cityServiceAreas.cityId, filters.cityId));
  if (filters.countryId) conditions.push(eq(cityServiceAreas.countryId, filters.countryId));
  if (filters.status) conditions.push(eq(cityServiceAreas.status, filters.status));
  if (filters.isActive !== undefined) conditions.push(eq(cityServiceAreas.isActive, filters.isActive));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(cityServiceAreas).where(where);
  const rows = await db
    .select({
      serviceArea: {
        id: cityServiceAreas.id,
        cityId: cityServiceAreas.cityId,
        countryId: cityServiceAreas.countryId,
        name: cityServiceAreas.name,
        status: cityServiceAreas.status,
        polygon: cityServiceAreas.polygon,
        resolution: cityServiceAreas.resolution,
        isActive: cityServiceAreas.isActive,
        createdAt: cityServiceAreas.createdAt,
        updatedAt: cityServiceAreas.updatedAt,
        hexCount: sql`COALESCE(array_length(${cityServiceAreas.hexCells}, 1), 0)`.mapWith(Number),
        hexCells: cityServiceAreas.hexCells,
      },
      city: cities,
    })
    .from(cityServiceAreas)
    .leftJoin(cities, eq(cityServiceAreas.cityId, cities.id))
    .where(where)
    .orderBy(desc(cityServiceAreas.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getServiceAreaById(id) {
  const [area] = await db
    .select({
      serviceArea: {
        id: cityServiceAreas.id,
        cityId: cityServiceAreas.cityId,
        countryId: cityServiceAreas.countryId,
        name: cityServiceAreas.name,
        status: cityServiceAreas.status,
        polygon: cityServiceAreas.polygon,
        resolution: cityServiceAreas.resolution,
        isActive: cityServiceAreas.isActive,
        createdAt: cityServiceAreas.createdAt,
        updatedAt: cityServiceAreas.updatedAt,
        hexCount: sql`COALESCE(array_length(${cityServiceAreas.hexCells}, 1), 0)`.mapWith(Number),
        hexCells: cityServiceAreas.hexCells,
      },
      city: cities,
    })
    .from(cityServiceAreas)
    .leftJoin(cities, eq(cityServiceAreas.cityId, cities.id))
    .where(eq(cityServiceAreas.id, id))
    .limit(1);

  if (!area) throw { statusCode: 404, message: 'Service area not found' };
  return area;
}

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

export async function createServiceArea(data) {
  let hexCells = null;
  let resolution = data.resolution || DEFAULT_RESOLUTION;
  let polygon = data.polygon ? normalizeGeoJsonPolygon(data.polygon) : null;
  if (polygon) {
    try {
      hexCells = polygonToHexCells(polygon, resolution);
      if (Array.isArray(hexCells) && hexCells.length > 10000) {
        hexCells = hexCells.slice(0, 10000);
      }
    } catch (err) {
      console.warn('H3 hex generation warning:', err?.message);
    }
  }

  const [area] = await db.insert(cityServiceAreas).values({
    ...data,
    polygon,
    hexCells,
    resolution,
  }).returning();

  return area;
}

export async function updateServiceArea(id, data) {
  data.updatedAt = new Date();
  if (data.polygon) {
    const resolution = data.resolution || DEFAULT_RESOLUTION;
    const polygon = normalizeGeoJsonPolygon(data.polygon);
    data.polygon = polygon;
    try {
      const hexCells = polygonToHexCells(polygon, resolution);
      data.hexCells = Array.isArray(hexCells) && hexCells.length > 10000 ? hexCells.slice(0, 10000) : hexCells;
    } catch (err) {
      console.warn('H3 hex generation warning:', err?.message);
    }
    data.resolution = resolution;
  }

  const [area] = await db.update(cityServiceAreas)
    .set(data)
    .where(eq(cityServiceAreas.id, id))
    .returning();

  if (!area) throw { statusCode: 404, message: 'Service area not found' };
  return area;
}

export async function setServiceAreaActive(id, isActive) {
  const [area] = await db.update(cityServiceAreas)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(cityServiceAreas.id, id))
    .returning();

  if (!area) throw { statusCode: 404, message: 'Service area not found' };
  return area;
}

export async function deleteServiceArea(id) {
  const [area] = await db.delete(cityServiceAreas)
    .where(eq(cityServiceAreas.id, id))
    .returning();

  if (!area) throw { statusCode: 404, message: 'Service area not found' };
  return area;
}

