/**
 * Pure scoring logic — no DB/Redis access, so it's directly unit-testable and
 * swappable (e.g. for a future batch-matching optimizer that reuses the same
 * per-candidate score but changes the selection step around it).
 *
 * Expects each candidate to already carry:
 *   etaMin           — routing ETA in minutes (real routing, not straight-line)
 *   rating           — driver's current rating (0-5)
 *   acceptanceRate   — 0-1, see getAcceptanceRate() in ride_offer.service.js
 *
 * Weights are looked up from the matching_weights table (see
 * matching-weights.service.js) rather than hardcoded, so ops can retune without
 * a deploy.
 */
export const DEFAULT_WEIGHTS = Object.freeze({
  distanceWeight: 0.5,
  ratingWeight: 0.3,
  acceptanceRateWeight: 0.2,
});

// Flat score bump for drivers whose active subscription plan has priorityMatching enabled
// (subscription_plans.priority_matching) — a fixed bonus rather than a matching_weights column
// since it's a per-driver plan perk, not a tunable ops weight.
const PRIORITY_MATCHING_BONUS = 0.15;

export function scoreDrivers(candidates, weights = DEFAULT_WEIGHTS) {
  const { distanceWeight, ratingWeight, acceptanceRateWeight } = { ...DEFAULT_WEIGHTS, ...weights };

  return candidates
    .map((c) => {
      const etaMin = Math.max(parseFloat(c.etaMin ?? c.distance_km ?? c.distanceKm ?? 1), 0.1);
      const rating = parseFloat(c.rating ?? 5);
      const acceptanceRate = c.acceptanceRate ?? 0.8;
      return {
        ...c,
        _score:
          distanceWeight * (1 / etaMin) +
          ratingWeight * (rating / 5) +
          acceptanceRateWeight * acceptanceRate +
          (c.priorityMatching ? PRIORITY_MATCHING_BONUS : 0),
      };
    })
    .sort((a, b) => b._score - a._score);
}
