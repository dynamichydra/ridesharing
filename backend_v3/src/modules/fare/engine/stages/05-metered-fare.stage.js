/**
 * Stage 5: Base Metered Fare Calculation (Base + Distance + Time + Minimum Floor).
 */
export async function executeMeteredFareStage(context) {
  const { rateCard, route } = context;

  const baseFareMinor = Math.round(rateCard.baseFareMinor);
  const distanceFareMinor = Math.round(route.distanceKm * rateCard.perKmRateMinor);
  const timeFareMinor = Math.round(route.durationInTrafficMin * rateCard.perMinRateMinor);
  const meteredSubtotalMinor = baseFareMinor + distanceFareMinor + timeFareMinor;
  const minFareMinor = Math.round(rateCard.minFareMinor);

  context.metered = {
    baseFareMinor,
    distanceFareMinor,
    timeFareMinor,
    meteredSubtotalMinor,
    minFareMinor,
  };

  return context;
}
