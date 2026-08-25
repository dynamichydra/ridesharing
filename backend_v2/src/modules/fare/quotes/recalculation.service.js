import { eq } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { rides } from '../../../../drizzle/schema/index.js';
import { roundToIncrement, fromMinor } from '../../../utils/money.js';

/**
 * Post-trip fare recalculation based on actual GPS pings, actual duration, and driver waiting time.
 */
export async function recalculateTripFare({
  rideId,
  actualDistanceKm,
  actualDurationMin,
  waitingDurationMin = 0,
  extraTollsMinor = 0,
  parkingFeeMinor = 0,
}) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  const snapshot = ride.fareSnapshot || {};
  const rateCard = snapshot.breakdown?.rateCard || snapshot.breakdown?.rate || {};
  const surgeInfo = snapshot.breakdown?.surge || {};
  const feesInfo = snapshot.breakdown?.fees || {};
  const taxInfo = snapshot.breakdown?.taxes || {};
  const promo = snapshot.breakdown?.promo || null;

  const baseRateMinor = rateCard.baseRateMinor || 0;
  const perKmRateMinor = rateCard.perKmRateMinor || 0;
  const perMinRateMinor = rateCard.perMinRateMinor || 0;
  const minFareMinor = rateCard.minFareMinor || 0;
  const waitingPricePerMinMinor = rateCard.waitingPricePerMinMinor || 0;
  const waitingGraceMin = rateCard.waitingGracePeriodMin || 3;

  // 1. Recalculate metered distance & time
  const billedDistanceKm = actualDistanceKm != null ? parseFloat(actualDistanceKm) : parseFloat(ride.distanceKm || '0');
  const billedDurationMin = actualDurationMin != null ? parseInt(actualDurationMin, 10) : (ride.durationMin || 0);

  const baseFareMinor = baseRateMinor;
  const distanceFareMinor = Math.round(billedDistanceKm * perKmRateMinor);
  const timeFareMinor = Math.round(billedDurationMin * perMinRateMinor);

  // 2. Waiting fare (after grace period)
  const chargeableWaitingMin = Math.max(0, waitingDurationMin - waitingGraceMin);
  const waitingFareMinor = Math.round(chargeableWaitingMin * waitingPricePerMinMinor);

  const meteredSubtotalMinor = baseFareMinor + distanceFareMinor + timeFareMinor + waitingFareMinor;

  // 3. Apply locked surge multiplier strictly to surgeable metered components
  const surgeMultiplier = surgeInfo.surgeMultiplier ? parseFloat(surgeInfo.surgeMultiplier) : 1.0;
  let surgeAmountMinor = 0;
  if (surgeMultiplier > 1.0) {
    surgeAmountMinor = Math.round(meteredSubtotalMinor * (surgeMultiplier - 1.0));
  }

  const subtotalBeforeMin = meteredSubtotalMinor + surgeAmountMinor;
  const minFareApplied = subtotalBeforeMin < minFareMinor;
  const clampedMeteredMinor = Math.max(subtotalBeforeMin, minFareMinor);

  // 4. Non-surgeable fees & extras
  const airportFeeMinor = feesInfo.airportFeeMinor || 0;
  const pickupFeeMinor = feesInfo.pickupFeeMinor || 0;
  const dropoffFeeMinor = feesInfo.dropoffFeeMinor || 0;
  const bookingFeeMinor = feesInfo.bookingFeeMinor || 0;
  const serviceFeeMinor = feesInfo.serviceFeeMinor || 0;
  const totalFeesMinor = airportFeeMinor + pickupFeeMinor + dropoffFeeMinor + bookingFeeMinor + serviceFeeMinor + extraTollsMinor + parkingFeeMinor;

  const preTaxFareMinor = clampedMeteredMinor + totalFeesMinor;

  // 5. Taxes (compute using recorded tax rates from snapshot)
  let exclusiveTaxRate = 0;
  if (taxInfo.taxRules) {
    exclusiveTaxRate = taxInfo.taxRules
      .filter((r) => !r.isInclusive)
      .reduce((sum, r) => sum + parseFloat(r.rate), 0);
  }
  const taxMinor = Math.round(preTaxFareMinor * exclusiveTaxRate);
  const postTaxFareMinor = preTaxFareMinor + taxMinor;

  // 6. Discount adjustment (percentage or fixed capped)
  let finalFareMinor = postTaxFareMinor;
  let discountAmountMinor = 0;
  if (promo) {
    if (promo.discountType === 'percentage') {
      discountAmountMinor = Math.round(postTaxFareMinor * (promo.discountValue / 100));
    } else if (promo.discountType === 'fixed') {
      discountAmountMinor = promo.discountAmountMinor || 0;
    }
    finalFareMinor = Math.max(0, postTaxFareMinor - discountAmountMinor);
  }

  // 7. Rounding
  const roundingIncrementMinor = snapshot.country?.roundingIncrementMinor || 100;
  const roundedFinalFareMinor = roundToIncrement(finalFareMinor, roundingIncrementMinor);

  const updatedBreakdown = {
    ...snapshot.breakdown,
    recalculated: true,
    actualDistanceKm: billedDistanceKm,
    actualDurationMin: billedDurationMin,
    waitingDurationMin,
    chargeableWaitingMin,
    waitingFareMinor,
    extraTollsMinor,
    parkingFeeMinor,
    metered: {
      baseFareMinor,
      distanceFareMinor,
      timeFareMinor,
      waitingFareMinor,
      meteredSubtotalMinor,
      minFareApplied,
    },
    surge: {
      ...surgeInfo,
      surgeableBaseMinor: meteredSubtotalMinor,
      surgeAmountMinor,
    },
    fees: {
      ...feesInfo,
      extraTollsMinor,
      parkingFeeMinor,
      totalFeesMinor,
    },
    preTaxFareMinor,
    taxMinor,
    finalFareMinor: roundedFinalFareMinor,
  };

  // Update ride record
  const [updatedRide] = await db.update(rides).set({
    actualDistanceKm: String(billedDistanceKm),
    actualDurationMin: billedDurationMin,
    finalFareMinor: roundedFinalFareMinor,
    fareSnapshot: {
      ...snapshot,
      breakdown: updatedBreakdown,
      finalFareMinor: roundedFinalFareMinor,
      estimatedFareMinor: roundedFinalFareMinor,
    },
  }).where(eq(rides.id, rideId)).returning();

  return {
    rideId,
    originalEstimatedFareMinor: ride.estimatedFareMinor,
    finalFareMinor: roundedFinalFareMinor,
    finalFare: fromMinor(roundedFinalFareMinor, ride.currencyCode),
    currency: ride.currencyCode,
    breakdown: updatedBreakdown,
  };
}
