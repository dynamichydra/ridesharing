import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cityTypeFares, vehicleTypes, cityTypes } from '../../../drizzle/schema/index.js';

/**
 * Resolves the active Fare Rate Card for a vehicle type from the City Type.
 *
 * Fallback Hierarchy:
 * 1. Specific rate configured in `city_type_fares` for `(cityTypeId, vehicleTypeId)`
 * 2. Baseline rates from `vehicle_types` table.
 */
export async function resolvePricingVersion({ vehicleTypeId, cityTypeId = null, cityId = null }) {
  if (cityTypeId) {
    const [tierFare] = await db.select({
      fare: cityTypeFares,
      vehicleTypeName: vehicleTypes.name,
      cityTypeName: cityTypes.name,
    })
    .from(cityTypeFares)
    .leftJoin(vehicleTypes, eq(cityTypeFares.vehicleTypeId, vehicleTypes.id))
    .leftJoin(cityTypes, eq(cityTypeFares.cityTypeId, cityTypes.id))
    .where(and(
      eq(cityTypeFares.isActive, true),
      eq(cityTypeFares.cityTypeId, cityTypeId),
      eq(cityTypeFares.vehicleTypeId, vehicleTypeId)
    ))
    .limit(1);

    if (tierFare) {
      return {
        version: {
          id: tierFare.fare.id,
          cityTypeId: tierFare.fare.cityTypeId,
          vehicleTypeId: tierFare.fare.vehicleTypeId,
          baseFareMinor: tierFare.fare.baseFareMinor,
          minFareMinor: tierFare.fare.minFareMinor,
          perKmRateMinor: tierFare.fare.perKmRateMinor,
          perMinRateMinor: tierFare.fare.perMinRateMinor,
          waitingPricePerMinMinor: tierFare.fare.waitingPricePerMinMinor || 0,
          waitingGracePeriodMin: tierFare.fare.waitingGracePeriodMin ?? 3,
          bookingFeeMinor: tierFare.fare.bookingFeeMinor || 0,
          serviceFeeMinor: tierFare.fare.serviceFeeMinor || 0,
          cancellationFeeMinor: tierFare.fare.cancellationFeeMinor || 0,
          noShowFeeMinor: tierFare.fare.noShowFeeMinor || 0,
          surgeFloorMultiplier: tierFare.fare.surgeFloorMultiplier || '1.00',
          surgeCapMultiplier: tierFare.fare.surgeCapMultiplier || '3.00',
          nonSubscriberCommissionRate: tierFare.fare.nonSubscriberCommissionRate || '0.2000',
          subscriberCommissionRate: tierFare.fare.subscriberCommissionRate || '0.0500',
          platformFeeMinor: tierFare.fare.platformFeeMinor || 0,
          minCommissionMinor: tierFare.fare.minCommissionMinor || 0,
          maxCommissionMinor: tierFare.fare.maxCommissionMinor || null,
          vehicleTypeName: tierFare.vehicleTypeName || 'Standard',
          cityTypeName: tierFare.cityTypeName || null,
        },
        source: 'city_type_fare',
      };
    }
  }

  // Fallback to vehicleTypes table baseline if no explicit city-type rate is configured
  const [vt] = await db.select().from(vehicleTypes)
    .where(eq(vehicleTypes.id, vehicleTypeId)).limit(1);

  if (!vt) {
    throw { statusCode: 404, message: `Vehicle type '${vehicleTypeId}' not found` };
  }

  const baselineVersion = {
    id: null,
    cityTypeId: null,
    vehicleTypeId: vt.id,
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
    nonSubscriberCommissionRate: '0.2000',
    subscriberCommissionRate: '0.0500',
    platformFeeMinor: 0,
    minCommissionMinor: 0,
    maxCommissionMinor: null,
    vehicleTypeName: vt.name,
  };

  return { version: baselineVersion, source: 'vehicle_type_baseline', vehicleType: vt };
}
