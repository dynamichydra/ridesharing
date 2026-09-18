import { detectZone } from '../../../zone/zone.service.js';
import { resolveHexZones } from '../../../zone/hex-zone.service.js';
import { getDefaultCountry, getCountryById, getCityById } from '../../../geo/geo.service.js';

/**
 * Stage 2: Geographic & Zone Resolution (Polygon + H3 Hex Hierarchies).
 */
export async function executeZoneResolverStage(context) {
  const { pickupLat, pickupLng, dropLat, dropLng } = context.request;

  // 1. Resolve pickup zone & dropoff zone
  const [pickupZone, dropZone] = await Promise.all([
    context.pickupZone !== undefined
      ? Promise.resolve(context.pickupZone)
      : detectZone(parseFloat(pickupLat), parseFloat(pickupLng), context.cityId),
    detectZone(parseFloat(dropLat), parseFloat(dropLng), context.cityId),
  ]);

  if (pickupZone?.type === 'restricted' || dropZone?.type === 'restricted') {
    throw {
      statusCode: 400,
      code: 'RESTRICTED_ZONE',
      message: 'Pickup or drop-off is located in a restricted geofenced area',
    };
  }

  // 2. Resolve country & currency
  let country = null;
  if (pickupZone?.countryId) {
    country = await getCountryById(pickupZone.countryId);
  } else if (context.countryId) {
    country = await getCountryById(context.countryId);
  } else {
    country = await getDefaultCountry();
  }

  // 3. Resolve H3 Hex Zones (ordered by priority DESC)
  const hexZones = await resolveHexZones(parseFloat(pickupLat), parseFloat(pickupLng));
  const hexZoneIds = new Set(hexZones.map((z) => z.id));

  // 4. Resolve City & City Type / Tier if mapped
  const resolvedCityId = context.cityId || pickupZone?.cityId || null;
  let cityTypeId = context.cityTypeId || null;
  let cityDensity = 'medium';
  let resolvedCityType = null;

  if (resolvedCityId) {
    try {
      const cityData = await getCityById(resolvedCityId);
      cityTypeId = cityData?.cityTypeId || cityData?.city?.cityTypeId || null;
      resolvedCityType = cityData?.cityType || null;
      if (resolvedCityType?.densityLevel) {
        cityDensity = resolvedCityType.densityLevel;
      }
    } catch {
      // Non-blocking fallback
    }
  }

  context.pickupZone = pickupZone;
  context.dropZone = dropZone;
  context.cityId = resolvedCityId;
  context.cityTypeId = cityTypeId;
  context.cityType = resolvedCityType;
  context.cityDensity = cityDensity;
  context.country = country;
  context.currencyCode = country.currencyCode;
  context.hexZones = hexZones;
  context.hexZoneIds = hexZoneIds;

  return context;
}
