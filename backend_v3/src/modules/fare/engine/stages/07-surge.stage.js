import { getDynamicSurge } from '../../surge/surge.service.js';

/**
 * Stage 7: Dynamic Surge Pricing Engine with Surge Isolation.
 *
 * CRITICAL RULE: Surge multiplier applies STRICTLY to surgeable components
 * (Base Fare + Distance Fare + Time Fare) AFTER fare-rule multipliers are applied.
 * Non-surgeable components (Airport fees, Tolls, Booking fees, Taxes) are never inflated.
 *
 * Pipeline:
 *   1. Apply fare-rule multiplier to metered subtotal  → ruleAdjustedMinor
 *   2. Fetch dynamic surge (real-time supply/demand)
 *   3. Apply dynamic surge ON TOP of rule-adjusted fare (not combined)
 *   4. Apply zone/cityType baseline multiplier (cost index) to the total
 *
 * This avoids the double-calculation bug where ruleMultiplier was baked into
 * the effectiveSurgeMultiplier and lost when effectiveSurge <= 1.0.
 */
export async function executeSurgeStage(context) {
  const { request, pickupZone, route, rateCard, metered, rules } = context;

  // 1. Apply fare-rule multiplier to metered subtotal
  //    (flat fare overrides metered entirely; skip multiplier in that case)
  let ruleAdjustedMinor = metered.meteredSubtotalMinor;
  if (rules.flatFareMinor === null && rules.ruleMultiplier !== 1.0) {
    ruleAdjustedMinor = Math.round(metered.meteredSubtotalMinor * rules.ruleMultiplier);
  }

  // 2. Fetch min/max surge constraints from rate card
  const minMultiplier = rateCard.surgeFloorMultiplier ? parseFloat(rateCard.surgeFloorMultiplier) : 1.0;
  const maxMultiplier = rateCard.surgeCapMultiplier ? parseFloat(rateCard.surgeCapMultiplier) : 3.0;

  // 3. Fetch real-time dynamic surge (supply/demand model)
  const surgeInfo = await getDynamicSurge({
    pickupLat: parseFloat(request.pickupLat),
    pickupLng: parseFloat(request.pickupLng),
    zoneId: pickupZone?.id || null,
    trafficDelayS: route.trafficDelayS || 0,
    minMultiplier,
    maxMultiplier,
  });

  // 4. Zone / CityType baseline cost index (applies to ALL fares, not just surge)
  //    e.g. Airport zone may have multiplier=1.20, Metro cityType.costIndex=1.10
  let baselineMultiplier = 1.0;
  if (pickupZone?.multiplier) {
    baselineMultiplier = parseFloat(pickupZone.multiplier);
  } else if (context.cityType?.costIndex) {
    baselineMultiplier = parseFloat(context.cityType.costIndex);
  }

  // 5. Compute dynamic surge amount (on rule-adjusted fare × baseline)
  //    Dynamic surge applies only above 1.0 (floor is already enforced by getDynamicSurge)
  const dynamicSurgeMultiplier = parseFloat(surgeInfo.multiplier);
  const surgeableBaseMinor = Math.round(ruleAdjustedMinor * baselineMultiplier);

  let surgeAmountMinor = 0;
  if (dynamicSurgeMultiplier > 1.0 && rules.flatFareMinor === null) {
    surgeAmountMinor = Math.round(surgeableBaseMinor * (dynamicSurgeMultiplier - 1.0));
  }

  // 6. Effective surge multiplier (for display/logging only — not re-applied to fare)
  const effectiveSurgeMultiplier = parseFloat(
    (dynamicSurgeMultiplier * rules.ruleMultiplier * baselineMultiplier).toFixed(4)
  );

  context.surge = {
    // Surgeable base AFTER rule-adjustment & baseline, BEFORE dynamic surge
    surgeableBaseMinor,
    // Dynamic surge component only
    surgeAmountMinor,
    // For display purposes
    surgeMultiplier: effectiveSurgeMultiplier,
    dynamicSurgeMultiplier,
    zoneMultiplier: baselineMultiplier,
    baselineMultiplier,
    ruleMultiplier: rules.ruleMultiplier,
    ruleAdjustedMinor,
    isSurging: dynamicSurgeMultiplier > 1.0,
    reason: surgeInfo.reason,
  };

  return context;
}
