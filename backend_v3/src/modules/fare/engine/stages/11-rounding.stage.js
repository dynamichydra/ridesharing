import { roundToIncrement, fromMinor } from '../../../../utils/money.js';

/**
 * Stage 11: Currency Rounding, Complete Breakdown & Snapshot Construction.
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
    pickupAirport,
    dropAirport,
    hexZones,
    rules,
    surge,
    fees,
    taxes,
    promo,
  } = context;

  const roundingIncrementMinor = country.roundingIncrementMinor || 100;
  const roundedPreDiscountMinor = roundToIncrement(taxes.postTaxFareMinor, roundingIncrementMinor);
  const roundedFinalFareMinor = Math.max(0, roundToIncrement(promo.discountedFareMinor, roundingIncrementMinor));

  const breakdown = {
    pricingPlanId: rateCard.pricingPlanId || null,
    pricingPlanVersionId: rateCard.id || null,
    pricingVersionId,
    pricingVersionNumber,
    rateCard: {
      baseRateMinor: rateCard.baseFareMinor,
      perKmRateMinor: rateCard.perKmRateMinor,
      perMinRateMinor: rateCard.perMinRateMinor,
      minFareMinor: rateCard.minFareMinor,
      taxPercentage: rateCard.taxPercentage || '0.00',
      waitingPricePerMinMinor: rateCard.waitingPricePerMinMinor || 0,
      bookingFeeMinor: rateCard.bookingFeeMinor || 0,
      serviceFeeMinor: rateCard.serviceFeeMinor || 0,
    },
    metered: {
      baseFareMinor: metered.baseFareMinor,
      distanceFareMinor: metered.distanceFareMinor,
      timeFareMinor: metered.timeFareMinor,
      meteredSubtotalMinor: metered.meteredSubtotalMinor,
      costIndexUsed: metered.costIndexUsed || 1.0,
      minFareApplied: fees.minFareApplied,
    },
    zones: {
      pickupZone: pickupZone ? { id: pickupZone.id, name: pickupZone.name, code: pickupZone.code } : null,
      dropZone: dropZone ? { id: dropZone.id, name: dropZone.name, code: dropZone.code } : null,
      pickupAirport: pickupAirport ? { id: pickupAirport.id, name: pickupAirport.name, code: pickupAirport.code } : null,
      dropAirport: dropAirport ? { id: dropAirport.id, name: dropAirport.name, code: dropAirport.code } : null,
      hexZones: hexZones.map((z) => ({ id: z.id, name: z.name, priority: z.priority })),
    },
    surge: {
      isSurging: surge.isSurging,
      surgeMultiplier: surge.surgeMultiplier,
      dynamicSurgeMultiplier: surge.dynamicSurgeMultiplier,
      ruleMultiplier: surge.ruleMultiplier,
      baselineMultiplier: surge.baselineMultiplier,
      ruleAdjustedMinor: surge.ruleAdjustedMinor,
      surgeableBaseMinor: surge.surgeableBaseMinor,
      surgeAmountMinor: surge.surgeAmountMinor,
      reason: surge.reason,
    },
    surcharges: {
      nightSurchargeMinor: fees.nightSurchargeMinor,
      peakSurchargeMinor: fees.peakSurchargeMinor,
      airportFeeMinor: fees.airportFeeMinor,
      tollAmountMinor: fees.tollAmountMinor,
      pickupFeeMinor: fees.pickupFeeMinor,
      dropoffFeeMinor: fees.dropoffFeeMinor,
    },
    fees: {
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
    userId: request.userId || null,
    cityId: context.cityId || null,
    pickupZoneId: pickupZone?.id || null,
    destinationZoneId: dropZone?.id || null,
    pickupAirportId: pickupAirport?.id || null,
    destinationAirportId: dropAirport?.id || null,
    vehicleTypeId: request.vehicleTypeId,
    vehicleTypeName,
    countryId: country.id,
    currencyCode,
    pricingPlanId: rateCard.pricingPlanId || null,
    pricingPlanVersionId: rateCard.id || null,
    pricingVersionId,
    appliedFareRuleIds: rules.appliedFareRuleIds,
    distanceKm: route.distanceKm,
    durationMin: route.durationMin,
    durationInTrafficMin: route.durationInTrafficMin,
    polyline: route.polyline,
    bounds: route.bounds,
    breakdown,

    // Line-item Snapshot Fields (Minor currency units)
    baseFareMinor: metered.baseFareMinor,
    distanceFareMinor: metered.distanceFareMinor,
    timeFareMinor: metered.timeFareMinor,
    waitingFareMinor: 0,
    nightSurchargeMinor: fees.nightSurchargeMinor,
    peakSurchargeMinor: fees.peakSurchargeMinor,
    surgeAmountMinor: surge.surgeAmountMinor,
    surgeMultiplier: surge.surgeMultiplier,
    airportFeeMinor: fees.airportFeeMinor,
    tollAmountMinor: fees.tollAmountMinor,
    bookingFeeMinor: fees.bookingFeeMinor,
    platformFeeMinor: fees.serviceFeeMinor,
    discountAmountMinor: promo.discountAmountMinor,
    taxAmountMinor: taxes.totalTaxMinor,
    subtotalMinor: roundedPreDiscountMinor,
    totalMinor: roundedFinalFareMinor,

    originalEstimatedFareMinor: roundedPreDiscountMinor,
    estimatedFareMinor: roundedFinalFareMinor,
    estimatedFare: fromMinor(roundedFinalFareMinor, currencyCode),
    currency: currencyCode,
  };

  return context;
}
