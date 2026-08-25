import { roundToIncrement, fromMinor } from '../../../../utils/money.js';

/**
 * Stage 11: Currency Rounding & Final Payload Construction.
 */
export async function executeRoundingStage(context) {
  const {
    request,
    country,
    currencyCode,
    route,
    pricingVersionId,
    pricingVersionNumber,
    vehicleTypeName,
    rateCard,
    metered,
    pickupZone,
    dropZone,
    hexZones,
    rules,
    surge,
    fees,
    taxes,
    promo,
  } = context;

  const roundingIncrementMinor = country.roundingIncrementMinor || 100; // default 1.00 unit
  const roundedPreDiscountMinor = roundToIncrement(taxes.postTaxFareMinor, roundingIncrementMinor);
  const roundedFinalFareMinor = Math.max(0, roundToIncrement(promo.discountedFareMinor, roundingIncrementMinor));

  const breakdown = {
    pricingVersionId,
    pricingVersionNumber,
    rateCard: {
      baseRateMinor: rateCard.baseFareMinor,
      perKmRateMinor: rateCard.perKmRateMinor,
      perMinRateMinor: rateCard.perMinRateMinor,
      minFareMinor: rateCard.minFareMinor,
      waitingPricePerMinMinor: rateCard.waitingPricePerMinMinor,
      bookingFeeMinor: rateCard.bookingFeeMinor,
      serviceFeeMinor: rateCard.serviceFeeMinor,
    },
    metered: {
      baseFareMinor: metered.baseFareMinor,
      distanceFareMinor: metered.distanceFareMinor,
      timeFareMinor: metered.timeFareMinor,
      meteredSubtotalMinor: metered.meteredSubtotalMinor,
      minFareApplied: fees.minFareApplied,
    },
    zones: {
      pickupZone: pickupZone ? { id: pickupZone.id, name: pickupZone.name, type: pickupZone.type, multiplier: pickupZone.multiplier } : null,
      dropZone: dropZone ? { id: dropZone.id, name: dropZone.name, type: dropZone.type } : null,
      hexZones: hexZones.map((z) => ({ id: z.id, name: z.name, type: z.type, priority: z.priority })),
    },
    surge: {
      isSurging: surge.isSurging,
      surgeMultiplier: surge.surgeMultiplier,
      dynamicSurgeMultiplier: surge.dynamicSurgeMultiplier,
      surgeableBaseMinor: surge.surgeableBaseMinor,
      surgeAmountMinor: surge.surgeAmountMinor,
      reason: surge.reason,
    },
    fees: {
      airportFeeMinor: fees.airportFeeMinor,
      pickupFeeMinor: fees.pickupFeeMinor,
      dropoffFeeMinor: fees.dropoffFeeMinor,
      bookingFeeMinor: fees.bookingFeeMinor,
      serviceFeeMinor: fees.serviceFeeMinor,
      totalFeesMinor: fees.totalFeesMinor,
    },
    taxes: {
      exclusiveTaxMinor: taxes.exclusiveTaxMinor,
      inclusiveTaxMinor: taxes.inclusiveTaxMinor,
      totalTaxMinor: taxes.totalTaxMinor,
      taxRules: taxes.taxRules,
    },
    rules: {
      flatFareMinor: rules.flatFareMinor,
      appliedRules: rules.appliedRules,
    },
    promo: promo.promoDetails,
  };

  context.result = {
    vehicleTypeId: request.vehicleTypeId,
    vehicleTypeName,
    countryId: country.id,
    currencyCode,
    pricingVersionId,
    appliedFareRuleIds: rules.appliedFareRuleIds,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    durationInTrafficMin: route.durationInTrafficMin,
    polyline: route.polyline,
    bounds: route.bounds,
    breakdown,
    originalEstimatedFareMinor: roundedPreDiscountMinor,
    discountAmountMinor: promo.discountAmountMinor,
    estimatedFareMinor: roundedFinalFareMinor,
    estimatedFare: fromMinor(roundedFinalFareMinor, currencyCode),
    currency: currencyCode,
  };

  return context;
}
