/**
 * Stage 5: Base Metered Fare Calculation (Base + Distance + Time + Minimum Floor).
 *
 * Applies city_types.costIndex when resolving from generic rate cards (country / global / tier level)
 * so that cities belonging to the same tier can easily scale base rates via cost_index.
 */
export async function executeMeteredFareStage(context) {
  const { rateCard, route, costIndex = '1.00', pricingSource } = context;

  // Apply costIndex factor if pricing was resolved from country/global/tier level (not explicit city/zone override)
  const isGenericCard = ['country_version', 'country_service_version', 'global_version', 'city_type_tier_version'].includes(pricingSource);
  const costFactor = isGenericCard ? (parseFloat(costIndex) || 1.0) : 1.0;

  const baseFareMinor     = Math.round(rateCard.baseFareMinor * costFactor);
  const distanceFareMinor = Math.round(route.distanceKm * rateCard.perKmRateMinor * costFactor);
  const timeFareMinor     = Math.round(route.durationInTrafficMin * rateCard.perMinRateMinor * costFactor);
  const meteredSubtotalMinor = baseFareMinor + distanceFareMinor + timeFareMinor;
  const minFareMinor      = Math.round(rateCard.minFareMinor * costFactor);

  context.metered = {
    baseFareMinor,
    distanceFareMinor,
    timeFareMinor,
    meteredSubtotalMinor,
    minFareMinor,
    costIndexUsed: costFactor,
  };

  return context;
}
