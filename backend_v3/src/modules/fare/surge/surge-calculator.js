/**
 * Pure surge calculation function.
 * Maps demand-to-supply ratio into a smooth, clamped multiplier curve between floor and cap.
 *
 * @param {Object} params
 * @param {number} params.demand - ride requests in area in recent window (e.g. 5-15 min)
 * @param {number} params.supply - active/available drivers in area
 * @param {number} params.trafficDelayS - delay seconds from Google Maps
 * @param {number} [params.minMultiplier=1.0] - minimum surge floor (default 1.0)
 * @param {number} [params.maxMultiplier=3.0] - maximum surge cap (default 3.0)
 * @returns {{ multiplier: number, ratio: number, reason: string }}
 */
export function calculateSurgeMultiplier({
  demand = 0,
  supply = 0,
  trafficDelayS = 0,
  minMultiplier = 1.0,
  maxMultiplier = 3.0,
}) {
  const min = Math.max(1.0, Number(minMultiplier));
  const max = Math.max(min, Number(maxMultiplier));

  // If no demand, baseline floor applies
  if (demand <= 0) {
    return { multiplier: min, ratio: 0, reason: 'Normal conditions' };
  }

  // Calculate ratio; treat 0 supply with non-zero demand as high imbalance
  const effectiveSupply = Math.max(1, supply);
  const ratio = demand / effectiveSupply;

  let multiplier = 1.0;

  if (ratio <= 1.0) {
    multiplier = 1.0;
  } else if (ratio <= 1.3) {
    multiplier = 1.1;
  } else if (ratio <= 1.6) {
    multiplier = 1.25;
  } else if (ratio <= 2.0) {
    multiplier = 1.5;
  } else if (ratio <= 2.5) {
    multiplier = 1.75;
  } else if (ratio <= 3.0) {
    multiplier = 2.0;
  } else {
    // Linear escalation above 3.0 ratio up to max
    multiplier = Math.min(max, 2.0 + (ratio - 3.0) * 0.25);
  }

  // Slight boost for severe traffic congestion (>10 min delay)
  if (trafficDelayS >= 600) {
    multiplier = Math.min(max, multiplier * 1.1);
  }

  const clamped = Math.min(max, Math.max(min, parseFloat(multiplier.toFixed(2))));

  return {
    multiplier: clamped,
    ratio: parseFloat(ratio.toFixed(2)),
    reason: clamped > 1.0 ? `Surge active (Demand/Supply ratio: ${ratio.toFixed(2)})` : 'Standard rate',
  };
}
