/**
 * Stage 8: Special Fees, Zone Surcharges & Minimum Fare Floor.
 */
export async function executeFeesStage(context) {
  const { pickupZone, dropZone, rateCard, metered, rules, surge } = context;

  // 1. Airport fees
  let airportFeeMinor = 0;
  if (pickupZone?.type === 'airport' || dropZone?.type === 'airport') {
    airportFeeMinor = Math.max(
      pickupZone?.airportFeeMinor || 0,
      dropZone?.airportFeeMinor || 0
    );
  }

  // 2. Zone pickup & dropoff fees
  const pickupFeeMinor = pickupZone?.pickupFeeMinor || 0;
  const dropoffFeeMinor = dropZone?.dropoffFeeMinor || 0;

  // 3. Platform & booking fees
  const bookingFeeMinor = rateCard.bookingFeeMinor || 0;
  const serviceFeeMinor = rateCard.serviceFeeMinor || 0;

  // 4. Subtotal calculation
  let subtotalBeforeMinMinor = 0;

  if (rules.flatFareMinor != null) {
    subtotalBeforeMinMinor = rules.flatFareMinor;
  } else {
    subtotalBeforeMinMinor = metered.meteredSubtotalMinor + surge.surgeAmountMinor;
  }

  // Check minimum fare floor against metered+surge subtotal
  const minFareApplied = subtotalBeforeMinMinor < rateCard.minFareMinor;
  const clampedMeteredMinor = Math.max(subtotalBeforeMinMinor, rateCard.minFareMinor);

  // Add non-surgeable fees on top of clamped metered fare
  const totalFeesMinor = airportFeeMinor + pickupFeeMinor + dropoffFeeMinor + bookingFeeMinor + serviceFeeMinor;
  const preTaxFareMinor = clampedMeteredMinor + totalFeesMinor;

  context.fees = {
    airportFeeMinor,
    pickupFeeMinor,
    dropoffFeeMinor,
    bookingFeeMinor,
    serviceFeeMinor,
    totalFeesMinor,
    minFareApplied,
    preTaxFareMinor,
  };

  return context;
}
