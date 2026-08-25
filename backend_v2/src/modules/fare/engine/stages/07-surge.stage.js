import { getDynamicSurge } from '../../surge/surge.service.js';

/**
 * Stage 7: Dynamic Surge Pricing Engine with Surge Isolation.
 *
 * CRITICAL RULE: Surge multiplier applies STRICTLY to surgeable components
 * (Base Fare + Distance Fare + Time Fare).
 * Non-surgeable components (Airport fees, Tolls, Booking fees, Taxes) are never inflated.
 */
export async function executeSurgeStage(context) {
  const { request, pickupZone, route, rateCard, metered, rules } = context;

  // 1. Check if rateCard has min/max surge constraints
  const minMultiplier = rateCard.surgeFloorMultiplier ? parseFloat(rateCard.surgeFloorMultiplier) : 1.0;
  const maxMultiplier = rateCard.surgeCapMultiplier ? parseFloat(rateCard.surgeCapMultiplier) : 3.0;

  // 2. Fetch real-time dynamic surge
  const surgeInfo = await getDynamicSurge({
    pickupLat: parseFloat(request.pickupLat),
    pickupLng: parseFloat(request.pickupLng),
    zoneId: pickupZone?.id || null,
    trafficDelayS: route.trafficDelayS || 0,
    minMultiplier,
    maxMultiplier,
  });

  // Zone multiplier if zone sets a baseline multiplier (e.g. 1.2x)
  const zoneMultiplier = pickupZone ? parseFloat(pickupZone.multiplier || '1.00') : 1.0;

  // Combine dynamic surge with dynamic fare rules multiplier
  const effectiveSurgeMultiplier = parseFloat((surgeInfo.multiplier * rules.ruleMultiplier * zoneMultiplier).toFixed(4));

  // Calculate Surgeable Amount
  const surgeableBaseMinor = metered.meteredSubtotalMinor;
  let surgeAmountMinor = 0;

  if (effectiveSurgeMultiplier > 1.0 && rules.flatFareMinor === null) {
    surgeAmountMinor = Math.round(surgeableBaseMinor * (effectiveSurgeMultiplier - 1.0));
  }

  context.surge = {
    surgeMultiplier: effectiveSurgeMultiplier,
    dynamicSurgeMultiplier: surgeInfo.multiplier,
    zoneMultiplier,
    ruleMultiplier: rules.ruleMultiplier,
    surgeableBaseMinor,
    surgeAmountMinor,
    reason: surgeInfo.reason,
    isSurging: effectiveSurgeMultiplier > 1.0,
  };

  return context;
}
