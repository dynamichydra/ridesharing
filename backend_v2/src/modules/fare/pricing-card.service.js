import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cityTypeFares, vehicleTypes, cityTypes } from '../../../drizzle/schema/index.js';

// Baseline CAD rates when operating in Canada (minor units = cents)
const CAD_BASELINE_RATES = {
  Bike: { baseFareMinor: 250, minFareMinor: 500, perKmRateMinor: 100, perMinRateMinor: 25, waitingPricePerMinMinor: 30 },
  Auto: { baseFareMinor: 300, minFareMinor: 600, perKmRateMinor: 110, perMinRateMinor: 30, waitingPricePerMinMinor: 30 },
  Cab: { baseFareMinor: 400, minFareMinor: 750, perKmRateMinor: 150, perMinRateMinor: 35, waitingPricePerMinMinor: 40 },
  'Premium Cab': { baseFareMinor: 700, minFareMinor: 1200, perKmRateMinor: 220, perMinRateMinor: 50, waitingPricePerMinMinor: 60 },
};

/**
 * Resolves the active Fare Rate Card for a vehicle type from the City Type.
 *
 * Fallback Hierarchy:
 * 1. Specific rate configured in `city_type_fares` for `(cityTypeId, vehicleTypeId)` (validating non-zero rates)
 * 2. Country/currency-specific baseline rates (e.g. CAD for Canada)
 * 3. Baseline rates from `vehicle_types` table.
 */
export async function resolvePricingVersion({ vehicleTypeId, cityTypeId = null, cityId = null, currencyCode = 'INR' }) {
  // 1. Fetch vehicle type baseline
  const [vt] = await db.select().from(vehicleTypes)
    .where(eq(vehicleTypes.id, vehicleTypeId)).limit(1);

  if (!vt) {
    throw { statusCode: 404, message: `Vehicle type '${vehicleTypeId}' not found` };
  }

  // 2. Check if CAD baseline should apply for Canadian market
  const isCAD = currencyCode?.toUpperCase() === 'CAD';
  const cadBaseline = isCAD ? (CAD_BASELINE_RATES[vt.name] || CAD_BASELINE_RATES.Cab) : null;

  // Determine fallback baseline rates
  const fallbackBaseFareMinor = cadBaseline?.baseFareMinor ?? vt.baseRateMinor;
  const fallbackMinFareMinor = cadBaseline?.minFareMinor ?? vt.minFareMinor;
  const fallbackPerKmRateMinor = cadBaseline?.perKmRateMinor ?? vt.perKmRateMinor;
  const fallbackPerMinRateMinor = cadBaseline?.perMinRateMinor ?? vt.perMinRateMinor;
  const fallbackWaitingRateMinor = cadBaseline?.waitingPricePerMinMinor ?? Math.round(fallbackPerMinRateMinor * 0.5);

  if (cityTypeId && !isCAD) {
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
      // Validate each rate: if perKmRateMinor <= 0, fall back to baseline so distance is never free
      const baseFareMinor = tierFare.fare.baseFareMinor > 0 ? tierFare.fare.baseFareMinor : fallbackBaseFareMinor;
      const minFareMinor = tierFare.fare.minFareMinor > 0 ? tierFare.fare.minFareMinor : fallbackMinFareMinor;
      const perKmRateMinor = tierFare.fare.perKmRateMinor > 0 ? tierFare.fare.perKmRateMinor : fallbackPerKmRateMinor;
      const perMinRateMinor = tierFare.fare.perMinRateMinor > 0 ? tierFare.fare.perMinRateMinor : fallbackPerMinRateMinor;
      const waitingPricePerMinMinor = tierFare.fare.waitingPricePerMinMinor > 0 ? tierFare.fare.waitingPricePerMinMinor : fallbackWaitingRateMinor;

      return {
        version: {
          id: tierFare.fare.id,
          cityTypeId: tierFare.fare.cityTypeId,
          vehicleTypeId: tierFare.fare.vehicleTypeId,
          baseFareMinor,
          minFareMinor,
          perKmRateMinor,
          perMinRateMinor,
          waitingPricePerMinMinor,
          waitingGracePeriodMin: tierFare.fare.waitingGracePeriodMin ?? 3,
          bookingFeeMinor: tierFare.fare.bookingFeeMinor || 0,
          serviceFeeMinor: tierFare.fare.serviceFeeMinor || 0,
          cancellationFeeMinor: tierFare.fare.cancellationFeeMinor || minFareMinor,
          noShowFeeMinor: tierFare.fare.noShowFeeMinor || minFareMinor,
          surgeFloorMultiplier: tierFare.fare.surgeFloorMultiplier || '1.00',
          surgeCapMultiplier: tierFare.fare.surgeCapMultiplier || '3.00',
          nonSubscriberCommissionRate: tierFare.fare.nonSubscriberCommissionRate || '0.2000',
          subscriberCommissionRate: tierFare.fare.subscriberCommissionRate || '0.0500',
          platformFeeMinor: tierFare.fare.platformFeeMinor || 0,
          minCommissionMinor: tierFare.fare.minCommissionMinor || 0,
          maxCommissionMinor: tierFare.fare.maxCommissionMinor || null,
          vehicleTypeName: tierFare.vehicleTypeName || vt.name || 'Standard',
          cityTypeName: tierFare.cityTypeName || null,
        },
        source: 'city_type_fare',
        vehicleType: vt,
      };
    }
  }

  const baselineVersion = {
    id: null,
    cityTypeId: null,
    vehicleTypeId: vt.id,
    baseFareMinor: fallbackBaseFareMinor,
    minFareMinor: fallbackMinFareMinor,
    perKmRateMinor: fallbackPerKmRateMinor,
    perMinRateMinor: fallbackPerMinRateMinor,
    waitingPricePerMinMinor: fallbackWaitingRateMinor,
    waitingGracePeriodMin: 3,
    bookingFeeMinor: 0,
    serviceFeeMinor: 0,
    cancellationFeeMinor: fallbackMinFareMinor,
    noShowFeeMinor: fallbackMinFareMinor,
    surgeFloorMultiplier: '1.00',
    surgeCapMultiplier: '3.00',
    nonSubscriberCommissionRate: '0.2000',
    subscriberCommissionRate: '0.0500',
    platformFeeMinor: 0,
    minCommissionMinor: 0,
    maxCommissionMinor: null,
    vehicleTypeName: vt.name,
  };

  return { version: baselineVersion, source: isCAD ? 'cad_market_baseline' : 'vehicle_type_baseline', vehicleType: vt };
}
