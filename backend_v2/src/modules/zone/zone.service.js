import { eq, and, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { zones, cities, cityServiceAreas } from '../../../drizzle/schema/index.js';
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
 * Checks whether a given (lat, lng) coordinate is within our active operational service area.
 * 2-Tier Spatial Hierarchy:
 * 1. Tier 1 - City Service Area (Macro Boundary):
 *    Validates that the point is inside an active city_service_area (and the parent city is active).
 *    This is where riders can create rides and drivers can go online.
 * 2. Tier 2 - Special Zones (Micro Pricing & Restriction Hubs):
 *    Special zones (airport, college, station, tech park, surge, restricted) exist inside city service areas.
 *    Used for fare multipliers and surcharges. If a city has no special zones, that is completely normal
 *    and operations proceed with zone: null (baseline multiplier depends on city type).
 *
 * Returns { inServiceArea: boolean, serviceArea?: Object, city?: Object, zone: Object|null, reason?: string, message?: string }
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

  // 1. Fetch active city service areas joined with parent city status
  const activeServiceAreas = await db.select({
    serviceArea: cityServiceAreas,
    cityName: cities.name,
    cityIsActive: cities.isActive,
    cityTypeId: cities.cityTypeId,
    timezone: cities.timezone,
  })
    .from(cityServiceAreas)
    .leftJoin(cities, eq(cityServiceAreas.cityId, cities.id))
    .where(and(
      eq(cityServiceAreas.isActive, true),
      eq(cityServiceAreas.status, 'ACTIVE')
    ));

  if (!activeServiceAreas.length) {
    // If no service areas configured in DB at all (fresh dev/test env), allow fallback
    return { inServiceArea: true, serviceArea: null, isFallback: true, zone: null };
  }

  // Find the matching city service area containing this coordinate
  const matchingServiceArea = activeServiceAreas.find(m =>
    m.serviceArea.polygon?.coordinates && isPointInPolygon(parsedLat, parsedLng, m.serviceArea.polygon.coordinates)
  ) || null;

  if (!matchingServiceArea) {
    return {
      inServiceArea: false,
      reason: 'OUT_OF_SERVICE_AREA',
      message: 'We do not operate in this area yet. Location is outside our operational service area.',
    };
  }

  // 2. City-level activation gate (e.g. city not launched yet or temporarily paused)
  if (matchingServiceArea.cityIsActive === false) {
    return {
      inServiceArea: false,
      reason: 'CITY_INACTIVE',
      message: `Service in ${matchingServiceArea.cityName || 'this city'} is currently unavailable or not launched yet.`,
    };
  }

  // 3. Special Zone detection inside the City Service Area (Airport, College, Station, Surge, Restricted)
  const matchedZone = await detectZone(parsedLat, parsedLng, matchingServiceArea.serviceArea.cityId);

  // 4. Restricted geofence gate (e.g. military/security zone inside city)
  if (matchedZone?.type === 'restricted') {
    return {
      inServiceArea: false,
      reason: 'RESTRICTED_ZONE',
      message: 'This location is in a restricted geofenced area.',
      serviceArea: matchingServiceArea.serviceArea,
      zone: matchedZone,
    };
  }

  // 5. Valid location inside City Service Area!
  // If matchedZone is null, that is completely normal (city has no special zones or point is outside special zones)
  return {
    inServiceArea: true,
    serviceArea: matchingServiceArea.serviceArea,
    city: {
      id: matchingServiceArea.serviceArea.cityId,
      name: matchingServiceArea.cityName,
      cityTypeId: matchingServiceArea.cityTypeId,
      timezone: matchingServiceArea.timezone,
    },
    zone: matchedZone,
  };
}

/**
 * Validates that a special zone's polygon vertices are contained within an active City Service Area.
 */
export async function validateZoneInsideServiceArea(polygon, cityId) {
  if (!cityId) {
    throw { statusCode: 400, message: 'cityId is required for zone creation' };
  }

  const serviceAreas = await db.select()
    .from(cityServiceAreas)
    .where(and(
      eq(cityServiceAreas.cityId, cityId),
      eq(cityServiceAreas.isActive, true),
      eq(cityServiceAreas.status, 'ACTIVE')
    ));

  if (!serviceAreas.length) {
    throw {
      statusCode: 400,
      code: 'NO_ACTIVE_SERVICE_AREA',
      message: 'Cannot create zone: No active city service area exists for this city. Create a city service area first.',
    };
  }

  const coords = polygon?.coordinates?.[0];
  if (!Array.isArray(coords) || coords.length === 0) {
    throw { statusCode: 400, message: 'Invalid zone polygon coordinates' };
  }

  const isInside = coords.every(([lng, lat]) =>
    serviceAreas.some(sa => sa.polygon?.coordinates && isPointInPolygon(lat, lng, sa.polygon.coordinates))
  );

  if (!isInside) {
    throw {
      statusCode: 400,
      code: 'ZONE_OUTSIDE_SERVICE_AREA',
      message: 'Special zone must be located entirely inside an active city service area',
    };
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
