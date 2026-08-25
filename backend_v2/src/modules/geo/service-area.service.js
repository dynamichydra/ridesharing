import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cityServiceAreas, cities } from '../../../drizzle/schema/index.js';
import { isPointInPolygon } from '../../utils/geo.js';
import { polygonToHexCells, latLngToHexCell, DEFAULT_RESOLUTION } from '../../utils/h3.js';
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
  return db.select().from(cityServiceAreas).where(and(...conditions));
}

export async function createServiceArea(data) {
  let hexCells = null;
  let resolution = data.resolution || DEFAULT_RESOLUTION;
  if (data.polygon) {
    hexCells = polygonToHexCells(data.polygon, resolution);
  }

  const [area] = await db.insert(cityServiceAreas).values({
    ...data,
    hexCells,
    resolution,
  }).returning();

  return area;
}
