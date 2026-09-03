import { eq, and, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { zones, cities, cityServiceAreas } from '../../../drizzle/schema/index.js';
import { isPointInPolygon } from '../../utils/geo.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

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

/**
 * Checks whether a given (lat, lng) coordinate is within our active operational service area.
 * Supports 2-Tier Enterprise Geofencing:
 * 1. Macro City Level: Checks whether the city is active (cities.isActive) and within active city service areas.
 * 2. Micro Zone Level: Checks specific operational zones, surge zones, airport zones, and restricted areas.
 *
 * Returns { inServiceArea: boolean, zone: Object|null, reason?: string, message?: string }
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

  // 1. Fetch zones joined with parent city status
  const allZones = await db.select({
    zone: zones,
    cityName: cities.name,
    cityIsActive: cities.isActive,
  })
  .from(zones)
  .leftJoin(cities, eq(zones.cityId, cities.id))
  .where(eq(zones.isActive, true));

  if (!allZones.length) {
    // If no zones configured in DB at all (fresh dev/test env), allow fallback
    return { inServiceArea: true, zone: null, isFallback: true };
  }

  const match = allZones.find(m => m.zone.polygon?.coordinates && isPointInPolygon(parsedLat, parsedLng, m.zone.polygon.coordinates)) || null;

  if (!match) {
    return {
      inServiceArea: false,
      reason: 'OUT_OF_SERVICE_AREA',
      message: 'We do not operate in this area yet. Location is outside our operational service area.',
    };
  }

  // 2. City-level activation gate (e.g. city not launched yet or temporarily paused)
  if (match.zone.cityId && match.cityIsActive === false) {
    return {
      inServiceArea: false,
      reason: 'CITY_INACTIVE',
      message: `Service in ${match.cityName || 'this city'} is currently unavailable or not launched yet.`,
    };
  }

  // 3. Zone-level restricted geofence gate (e.g. military/security/restricted zone)
  if (match.zone.type === 'restricted') {
    return {
      inServiceArea: false,
      reason: 'RESTRICTED_ZONE',
      message: 'This location is in a restricted geofenced area.',
    };
  }

  // 4. Macro City Service Area boundary check (if city_service_areas exist for this city)
  if (match.zone.cityId) {
    const serviceAreas = await db.select()
      .from(cityServiceAreas)
      .where(and(
        eq(cityServiceAreas.cityId, match.zone.cityId),
        eq(cityServiceAreas.isActive, true)
      ));

    if (serviceAreas.length > 0) {
      const insideCityBoundary = serviceAreas.some(sa =>
        sa.status === 'ACTIVE' && sa.polygon?.coordinates && isPointInPolygon(parsedLat, parsedLng, sa.polygon.coordinates)
      );
      if (!insideCityBoundary) {
        return {
          inServiceArea: false,
          reason: 'OUTSIDE_CITY_SERVICE_AREA',
          message: `Location is outside our active service boundary for ${match.cityName || 'this city'}.`,
        };
      }
    }
  }

  return { inServiceArea: true, zone: match.zone };
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
