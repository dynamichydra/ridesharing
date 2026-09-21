import { eq, and, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { zones, cities } from '../../../drizzle/schema/index.js';
import { isPointInPolygon } from '../../utils/geo.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

export async function listAll(countryId) {
  const conditions = [eq(zones.isActive, true)];
  if (countryId) conditions.push(eq(zones.countryId, countryId));
  const rows = await db
    .select({
      zone: zones,
      cityName: cities.name,
    })
    .from(zones)
    .leftJoin(cities, eq(zones.cityId, cities.id))
    .where(and(...conditions));
  return rows.map(r => ({ ...r.zone, cityName: r.cityName }));
}

export async function listPaginated(page, limit, offset, countryId) {
  const where = countryId ? eq(zones.countryId, countryId) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(zones).where(where);
  const rows = await db
    .select({
      zone: zones,
      cityName: cities.name,
    })
    .from(zones)
    .leftJoin(cities, eq(zones.cityId, cities.id))
    .where(where)
    .limit(limit)
    .offset(offset);
  return {
    rows: rows.map(r => ({ ...r.zone, cityName: r.cityName })),
    pagination: paginate(page, limit, total),
  };
}

export async function getById(id) {
  const [row] = await db
    .select({
      zone: zones,
      cityName: cities.name,
    })
    .from(zones)
    .leftJoin(cities, eq(zones.cityId, cities.id))
    .where(eq(zones.id, id))
    .limit(1);
  if (!row) throw { statusCode: 404, message: 'Zone not found' };
  return { ...row.zone, cityName: row.cityName };
}

import * as h3 from 'h3-js';

export async function detectZone(lat, lng, cityId = null) {
  const conditions = [eq(zones.isActive, true)];
  if (cityId) conditions.push(eq(zones.cityId, cityId));
  const allZones = await db.select().from(zones).where(and(...conditions));
  allZones.sort((a, b) => (b.priority || 1) - (a.priority || 1));

  // 1. Try fast H3 Hex Cell match if indexed
  for (const z of allZones) {
    if (Array.isArray(z.hexCells) && z.hexCells.length > 0) {
      const res = z.resolution || 8;
      const cell = h3.latLngToCell(lat, lng, res);
      if (z.hexCells.includes(cell)) return z;
    }
  }

  // 2. Spatial polygon point-in-polygon check
  return allZones.find(z => z.polygon?.coordinates && isPointInPolygon(lat, lng, z.polygon.coordinates)) || null;
}

/**
 * Checks whether a given (lat, lng) coordinate is within our active operational service area.
 * 2-Tier Spatial Hierarchy:
 * 1. Tier 1 - City Operational Perimeter (Macro Boundary):
 *    Validates that the point is inside an active city via H3 Hex Cells (O(1) fast lookup) or Polygon perimeter.
 * 2. Tier 2 - Special Zones (Micro Pricing & Restriction Hubs):
 *    Special zones (airport, college, station, tech park, surge, restricted) exist inside city perimeters.
 *
 * Returns { inServiceArea: boolean, city?: Object, zone: Object|null, reason?: string, message?: string }
 */
export async function isLocationInServiceArea(lat, lng) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return {
      inServiceArea: false,
      reason: 'INVALID_COORDINATES',
      message: 'Invalid coordinates provided',
    };
  }

  // 1. Fetch active cities
  const activeCities = await db.select({
    cityId: cities.id,
    cityName: cities.name,
    cityIsActive: cities.isActive,
    timezone: cities.timezone,
    polygon: cities.polygon,
    hexCells: cities.hexCells,
    resolution: cities.resolution,
  })
    .from(cities)
    .where(eq(cities.isActive, true));

  // 2. Find matching city by H3 Hex Cell or Polygon boundary
  let matchingCity = null;

  for (const c of activeCities) {
    // Fast O(1) H3 Hex index match
    if (Array.isArray(c.hexCells) && c.hexCells.length > 0) {
      const cell = h3.latLngToCell(parsedLat, parsedLng, c.resolution || 8);
      if (c.hexCells.includes(cell)) {
        matchingCity = c;
        break;
      }
    }
    // Spatial Polygon boundary check
    if (c.polygon?.coordinates && isPointInPolygon(parsedLat, parsedLng, c.polygon.coordinates)) {
      matchingCity = c;
      break;
    }
  }

  // If no city boundaries or hex cells are configured anywhere in DB yet (fresh dev/test env), check zones or allow fallback
  const hasConfiguredCityBoundaries = activeCities.some(
    c => (c.polygon?.coordinates) || (Array.isArray(c.hexCells) && c.hexCells.length > 0)
  );

  if (!matchingCity && hasConfiguredCityBoundaries) {
    return {
      inServiceArea: false,
      reason: 'OUT_OF_SERVICE_AREA',
      message: 'We do not operate in this area yet. Location is outside our active city operational boundary.',
    };
  }

  // If matched a city, or in fallback mode (when no macro city boundaries set yet)
  const resolvedCityId = matchingCity?.cityId || null;
  const matchedZone = await detectZone(parsedLat, parsedLng, resolvedCityId);

  if (matchedZone?.type === 'restricted') {
    return {
      inServiceArea: false,
      reason: 'RESTRICTED_ZONE',
      message: 'This location is in a restricted geofenced area.',
      city: matchingCity,
      zone: matchedZone,
    };
  }

  const defaultCity = matchingCity || activeCities[0] || null;

  return {
    inServiceArea: true,
    serviceArea: defaultCity ? { id: defaultCity.cityId, name: defaultCity.cityName } : null,
    isFallback: !matchingCity,
    city: defaultCity ? {
      id: defaultCity.cityId,
      name: defaultCity.cityName,
      timezone: defaultCity.timezone,
    } : null,
    zone: matchedZone,
  };
}

/**
 * Validates that a special zone's city exists.
 */
export async function validateZoneInsideServiceArea(polygon, cityId) {
  if (!cityId) {
    throw { statusCode: 400, message: 'cityId is required for zone creation' };
  }

  const [city] = await db.select().from(cities).where(eq(cities.id, cityId)).limit(1);
  if (!city) {
    throw { statusCode: 404, message: 'City not found' };
  }
}

export async function create(data) {
  if (data.polygon && data.cityId) {
    await validateZoneInsideServiceArea(data.polygon, data.cityId);
  }
  const [zone] = await db.insert(zones).values(data).returning();
  return zone;
}

export async function update(id, data) {
  const [existing] = await db.select().from(zones).where(eq(zones.id, id)).limit(1);
  if (!existing) throw { statusCode: 404, message: 'Zone not found' };

  const cityId = data.cityId || existing.cityId;
  const polygon = data.polygon || existing.polygon;
  if (data.polygon && cityId) {
    await validateZoneInsideServiceArea(polygon, cityId);
  }

  data.updatedAt = new Date();
  const [zone] = await db.update(zones).set(data).where(eq(zones.id, id)).returning();
  return zone;
}

export async function setActive(id, isActive, adminId) {
  const [zone] = await db.update(zones).set({ isActive, updatedAt: new Date() }).where(eq(zones.id, id)).returning();
  if (!zone) throw { statusCode: 404, message: 'Zone not found' };
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'ZONE_ENABLED' : 'ZONE_DISABLED',
    entityType: 'zone', entityId: id,
  });
  return zone;
}
