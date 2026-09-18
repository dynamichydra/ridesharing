/**
 * Stage 8: Special Fees, Surcharges, Tolls & Minimum Fare Floor.
 */
export async function executeFeesStage(context) {
  const { pickupZone, dropZone, rateCard, rules, surge } = context;

  // 1. Airport fee (from rules stage or zone record fallback)
  const zonePickupAirportFee = pickupZone?.airportFeeMinor || 0;
  const zoneDropAirportFee   = dropZone?.airportFeeMinor || 0;
  const zoneAirportFee       = Math.max(zonePickupAirportFee, zoneDropAirportFee);
  const airportFeeMinor      = Math.max(rules.airportFeeMinor || 0, zoneAirportFee);

  // 2. Toll amount (from toll rules stage)
  const tollAmountMinor = rules.tollAmountMinor || 0;

  // 3. Night & Peak Surcharges (fixed portions)
  const nightSurchargeMinor = rules.nightSurchargeMinor || 0;
  const peakSurchargeMinor  = rules.peakSurchargeMinor || 0;

  // 4. Zone pickup & dropoff fees
  const pickupFeeMinor  = pickupZone?.pickupFeeMinor  || 0;
  const dropoffFeeMinor = dropZone?.dropoffFeeMinor   || 0;

  // 5. Platform & booking fees (from rate card)
  const bookingFeeMinor = rateCard.bookingFeeMinor || 0;
  const serviceFeeMinor = rateCard.serviceFeeMinor || 0;

  // 6. Compute pre-minimum subtotal
  let subtotalBeforeMinMinor = 0;
  if (rules.flatFareMinor != null) {
    subtotalBeforeMinMinor = rules.flatFareMinor;
  } else {
    subtotalBeforeMinMinor = surge.surgeableBaseMinor + surge.surgeAmountMinor;
  }

  // 7. Minimum fare floor
  const minFareApplied = subtotalBeforeMinMinor < rateCard.minFareMinor;
  const clampedMeteredMinor = Math.max(subtotalBeforeMinMinor, rateCard.minFareMinor);

  // 8. Add all non-surgeable fixed additions
  const totalFeesMinor = airportFeeMinor +
    tollAmountMinor +
    nightSurchargeMinor +
    peakSurchargeMinor +
    pickupFeeMinor +
    dropoffFeeMinor +
    bookingFeeMinor +
    serviceFeeMinor;

  const preTaxFareMinor = clampedMeteredMinor + totalFeesMinor;

  context.fees = {
    airportFeeMinor,
    tollAmountMinor,
    nightSurchargeMinor,
    peakSurchargeMinor,
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
