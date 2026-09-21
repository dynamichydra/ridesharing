import { eq, and, count, desc, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cities, cityTypes } from '../../../drizzle/schema/index.js';
import { isPointInPolygon } from '../../utils/geo.js';
import { paginate } from '../../utils/response.js';

/**
 * Checks if a given coordinate is within an active city service area.
 * Queries the active `cities` table directly.
 */
export async function validateLocationInServiceArea(lat, lng) {
  const activeCities = await db.select({
    id: cities.id,
    name: cities.name,
    countryId: cities.countryId,
    cityTypeId: cities.cityTypeId,
    status: cities.status,
    polygon: cities.polygon,
    hexCells: cities.hexCells,
    isActive: cities.isActive,
    timezone: cities.timezone,
    cityTypeName: cityTypes.name,
  })
  .from(cities)
  .leftJoin(cityTypes, eq(cities.cityTypeId, cityTypes.id))
  .where(and(
    eq(cities.isActive, true),
    eq(cities.status, 'ACTIVE')
  ));

  // If no cities with boundaries are configured in DB yet (fresh setup), allow fallback
  if (!activeCities.length) {
    return { isAvailable: true, city: null, isFallback: true };
  }

  const matchingCity = activeCities.find((city) => {
    if (!city.polygon || !city.polygon.coordinates) return false;
    return isPointInPolygon(lat, lng, city.polygon.coordinates);
  });

  if (!matchingCity) {
    return {
      isAvailable: false,
      reason: 'OUT_OF_SERVICE_AREA',
      message: 'Pickup location is outside our active city service boundaries',
    };
  }

  if (matchingCity.isActive === false || matchingCity.status !== 'ACTIVE') {
    return {
      isAvailable: false,
      reason: 'CITY_INACTIVE',
      message: `Service in ${matchingCity.name} is currently unavailable or paused`,
    };
  }

  return {
    isAvailable: true,
    city: matchingCity,
    cityId: matchingCity.id,
    countryId: matchingCity.countryId,
    cityTypeId: matchingCity.cityTypeId,
    timezone: matchingCity.timezone,
  };
}

export async function listActiveServiceCities(countryId = null) {
  const conditions = [
    eq(cities.isActive, true),
    eq(cities.status, 'ACTIVE'),
  ];
  if (countryId) conditions.push(eq(cities.countryId, countryId));

  return db
    .select({
      id: cities.id,
      name: cities.name,
      countryId: cities.countryId,
      cityTypeId: cities.cityTypeId,
      status: cities.status,
      polygon: cities.polygon,
      resolution: cities.resolution,
      isActive: cities.isActive,
      createdAt: cities.createdAt,
      updatedAt: cities.updatedAt,
      hexCount: sql`COALESCE(array_length(${cities.hexCells}, 1), 0)`.mapWith(Number),
    })
    .from(cities)
    .where(and(...conditions));
}
