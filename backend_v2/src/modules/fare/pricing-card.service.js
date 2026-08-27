import { eq, and, desc, isNull, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { pricingVersions, vehicleTypes } from '../../../drizzle/schema/index.js';

/**
 * Resolves the active immutable rate card / pricing version.
 * Checks for zone-specific overrides first, then city-specific, then global vehicle type baseline.
 */
export async function resolvePricingVersion({ vehicleTypeId, cityId = null, zoneId = null, cityTypeId = null }) {
  // 1. Try to find explicit pricing version
  const conditions = [
    eq(pricingVersions.isActive, true),
    eq(pricingVersions.vehicleTypeId, vehicleTypeId),
  ];

  // Level 1: Specific Zone Override (e.g. Airport)
  if (zoneId) {
    const [zoneVersion] = await db.select().from(pricingVersions)
      .where(and(...conditions, eq(pricingVersions.zoneId, zoneId)))
      .orderBy(desc(pricingVersions.version))
      .limit(1);

    if (zoneVersion) return { version: zoneVersion, source: 'zone_version' };
  }

  // Level 2: Specific City Override
  if (cityId) {
    const [cityVersion] = await db.select().from(pricingVersions)
      .where(and(...conditions, eq(pricingVersions.cityId, cityId), isNull(pricingVersions.zoneId)))
      .orderBy(desc(pricingVersions.version))
      .limit(1);

    if (cityVersion) return { version: cityVersion, source: 'city_version' };
  }

  // Level 3: City Type / Tier Card (e.g. TIER_1_METRO, TIER_2_URBAN)
  if (cityTypeId) {
    const [tierVersion] = await db.select().from(pricingVersions)
      .where(and(
        ...conditions,
        eq(pricingVersions.cityTypeId, cityTypeId),
        isNull(pricingVersions.cityId),
        isNull(pricingVersions.zoneId)
      ))
      .orderBy(desc(pricingVersions.version))
      .limit(1);

    if (tierVersion) return { version: tierVersion, source: 'city_type_tier_version' };
  }

  // Level 4: Global version for this vehicle type
  const [globalVersion] = await db.select().from(pricingVersions)
    .where(and(
      ...conditions,
      isNull(pricingVersions.cityTypeId),
      isNull(pricingVersions.cityId),
      isNull(pricingVersions.zoneId)
    ))
    .orderBy(desc(pricingVersions.version))
    .limit(1);

  if (globalVersion) return { version: globalVersion, source: 'global_version' };

  // 2. Fallback to vehicleTypes table baseline if no version rows configured yet
  const [vt] = await db.select().from(vehicleTypes)
    .where(eq(vehicleTypes.id, vehicleTypeId)).limit(1);

  if (!vt) {
    throw { statusCode: 404, message: `Vehicle type '${vehicleTypeId}' not found` };
  }

  const baselineVersion = {
    id: null,
    vehicleTypeId: vt.id,
    version: 1,
    baseFareMinor: vt.baseRateMinor,
    minFareMinor: vt.minFareMinor,
    perKmRateMinor: vt.perKmRateMinor,
    perMinRateMinor: vt.perMinRateMinor,
    waitingPricePerMinMinor: Math.round(vt.perMinRateMinor * 0.5),
    waitingGracePeriodMin: 3,
    bookingFeeMinor: 0,
    serviceFeeMinor: 0,
    cancellationFeeMinor: vt.minFareMinor,
    noShowFeeMinor: vt.minFareMinor,
    surgeFloorMultiplier: '1.00',
    surgeCapMultiplier: '3.00',
    vehicleTypeName: vt.name,
  };

  return { version: baselineVersion, source: 'vehicle_type_baseline', vehicleType: vt };
}
