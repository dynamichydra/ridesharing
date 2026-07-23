/**
 * Pure decision logic for the estimate-vs-actual reconciliation policy — no
 * DB/Redis access, unit-testable in isolation.
 *
 * Policy (launch default, see README): if the GPS-derived actual fare exceeds
 * the upfront estimate by more than DEVIATION_THRESHOLD_PCT, don't auto-bill the
 * higher amount — flag the trip for manual review instead. Within tolerance,
 * the accurately-recomputed actual fare is billed (which may be lower than the
 * estimate, e.g. a shorter-than-expected route — that's never flagged, only
 * the case where the rider would be charged more than quoted).
 */
export const DEVIATION_THRESHOLD_PCT = 20;

export function shouldFlagDeviation(estimatedFareMinor, actualFareMinor, thresholdPct = DEVIATION_THRESHOLD_PCT) {
  const deviationPct = estimatedFareMinor > 0
    ? ((actualFareMinor - estimatedFareMinor) / estimatedFareMinor) * 100
    : 0;
  return {
    deviationPct: parseFloat(deviationPct.toFixed(2)),
    flagged: deviationPct > thresholdPct,
  };
}
