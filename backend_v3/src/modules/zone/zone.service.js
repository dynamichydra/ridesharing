import { eq, and, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { zones, cities, cityTypes } from '../../../drizzle/schema/index.js';
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

export async function detectZone(lat, lng, cityId = null) {
  const conditions = [eq(zones.isActive, true)];
  if (cityId) conditions.push(eq(zones.cityId, cityId));
  const allZones = await db.select().from(zones).where(and(...conditions));
  allZones.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  return allZones.find(z => z.polygon?.coordinates && isPointInPolygon(lat, lng, z.polygon.coordinates)) || null;
}

/**
 * Checks whether a given (lat, lng) coordinate is within our active operational city boundary.
 * 2-Tier Spatial Hierarchy:
 * 1. Tier 1 - City Operational Perimeter (Macro Boundary):
 *    Validates that the point is inside an active city with polygon boundary.
 * 2. Tier 2 - Special Zones (Micro Pricing & Restriction Hubs):
 *    Special zones (airport, college, station, tech park, surge, restricted) exist inside city perimeters.
 *    Used for fare rules and geofences. If a city has no special zones, operations proceed normally with zone: null.
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

  // 1. Check active cities with polygon boundaries
  const activeCities = await db.select({
    cityId: cities.id,
    cityName: cities.name,
    cityIsActive: cities.isActive,
    cityTypeId: cities.cityTypeId,
    timezone: cities.timezone,
    costIndex: cityTypes.costIndex,
    polygon: cities.polygon,
    boundary: cities.boundary,
  })
    .from(cities)
    .leftJoin(cityTypes, eq(cities.cityTypeId, cityTypes.id))
    .where(eq(cities.isActive, true));

  if (!activeCities.some(c => c.polygon?.coordinates)) {
    // If no city boundaries configured in DB yet (fresh dev/test env), allow fallback
    return { inServiceArea: true, serviceArea: null, isFallback: true, zone: null };
  }

  const matchingCity = activeCities.find(c =>
    c.polygon?.coordinates && isPointInPolygon(parsedLat, parsedLng, c.polygon.coordinates)
  );

  if (!matchingCity) {
    return {
      inServiceArea: false,
      reason: 'OUT_OF_SERVICE_AREA',
      message: 'We do not operate in this area yet. Location is outside our active city operational boundary.',
    };
  }

  if (matchingCity.cityIsActive === false) {
    return {
      inServiceArea: false,
      reason: 'CITY_INACTIVE',
      message: `Service in ${matchingCity.cityName || 'this city'} is currently unavailable or not launched yet.`,
    };
  }

  const matchedZone = await detectZone(parsedLat, parsedLng, matchingCity.cityId);
  if (matchedZone?.type === 'restricted') {
    return {
      inServiceArea: false,
      reason: 'RESTRICTED_ZONE',
      message: 'This location is in a restricted geofenced area.',
      city: matchingCity,
      zone: matchedZone,
    };
  }

  return {
    inServiceArea: true,
    serviceArea: { id: matchingCity.cityId, name: matchingCity.cityName, polygon: matchingCity.polygon },
    city: {
      id: matchingCity.cityId,
      name: matchingCity.cityName,
      cityTypeId: matchingCity.cityTypeId,
      timezone: matchingCity.timezone,
      costIndex: matchingCity.costIndex || '1.00',
    },
    zone: matchedZone,
  };
}

/**
 * Validates that a special zone's polygon vertices are contained within an active City boundary.
 */
export async function validateZoneInsideServiceArea(polygon, cityId) {
  if (!cityId) {
    throw { statusCode: 400, message: 'cityId is required for zone creation' };
  }

  const [city] = await db.select().from(cities).where(eq(cities.id, cityId)).limit(1);
  if (!city) {
    throw { statusCode: 404, message: 'City not found' };
  }

  if (city.polygon?.coordinates) {
    const coords = polygon?.coordinates?.[0];
    if (!Array.isArray(coords) || coords.length === 0) {
      throw { statusCode: 400, message: 'Invalid zone polygon coordinates' };
    }
    const isInside = coords.every(([lng, lat]) =>
      isPointInPolygon(lat, lng, city.polygon.coordinates)
    );
    if (!isInside) {
      throw {
        statusCode: 400,
        code: 'ZONE_OUTSIDE_SERVICE_AREA',
        message: 'Special zone must be located entirely inside the city operational boundary',
      };
    }
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
