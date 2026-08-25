/**
 * Multi-Factor Candidate Scoring Engine
 *
 * Produces normalized (0 to 1) feature scores combined with configurable weights.
 * Supports explainable matching by returning detailed feature score breakdowns.
 */

export const DEFAULT_WEIGHTS = Object.freeze({
  etaWeight: 0.40,
  distanceWeight: 0.15,
  idleWeight: 0.10,
  ratingWeight: 0.10,
  acceptanceRateWeight: 0.10,
  cancellationRateWeight: 0.05,
  directionWeight: 0.05,
  zoneDemandWeight: 0.05,
});

const PRIORITY_MATCHING_BONUS = 0.15;

/**
 * Calculates heading alignment between driver's current heading and bearing to pickup.
 * Returns a score between 0.0 (heading away) and 1.0 (heading directly toward pickup).
 */
export function calculateDirectionAlignment(driverLat, driverLng, driverHeading, pickupLat, pickupLng) {
  if (driverHeading == null || isNaN(driverHeading)) {
    return 0.5; // neutral when heading unknown
  }

  // Calculate bearing from driver to pickup
  const y = Math.sin((pickupLng - driverLng) * (Math.PI / 180)) * Math.cos(pickupLat * (Math.PI / 180));
  const x =
    Math.cos(driverLat * (Math.PI / 180)) * Math.sin(pickupLat * (Math.PI / 180)) -
    Math.sin(driverLat * (Math.PI / 180)) *
      Math.cos(pickupLat * (Math.PI / 180)) *
      Math.cos((pickupLng - driverLng) * (Math.PI / 180));
  let bearing = (Math.atan2(y, x) * 180) / Math.PI;
  bearing = (bearing + 360) % 360;

  // Angle difference between heading and bearing
  const diff = Math.abs(bearing - driverHeading);
  const angleDiff = diff > 180 ? 360 - diff : diff;

  // 0 deg diff -> score 1.0, 180 deg diff -> score 0.0
  return Math.max(0, 1 - angleDiff / 180);
}

/**
 * Calculates normalized idle time score (fairness).
 * Drivers waiting longer receive a higher idle score up to 60 minutes.
 */
export function calculateIdleScore(lastTripEndedAt, lastSeenAt) {
  const reference = lastTripEndedAt ? new Date(lastTripEndedAt).getTime() : (lastSeenAt ? new Date(lastSeenAt).getTime() : null);
  if (!reference) return 0.5;

  const idleMinutes = Math.max(0, (Date.now() - reference) / (1000 * 60));
  return Math.min(1.0, idleMinutes / 60); // caps at 60 mins idle
}

/**
 * Scores and ranks candidate drivers.
 *
 * @param {Array<Object>} candidates Enriched candidate pool with ETA, distance, rating
 * @param {Object} weights Configurable scoring weights
 * @param {Object} options Additional context (pickupLat, pickupLng, etc.)
 * @returns {Array<Object>} Sorted candidates with `_score` and `scoreBreakdown`
 */
export function scoreDrivers(candidates, weights = DEFAULT_WEIGHTS, options = {}) {
  if (!candidates || candidates.length === 0) return [];

  const activeWeights = { ...DEFAULT_WEIGHTS, ...weights };
  const { pickupLat, pickupLng } = options;

  return candidates
    .map((c) => {
      const etaMin = Math.max(parseFloat(c.etaMin ?? c.distance_km ?? c.distanceKm ?? 1), 0.1);
      const distanceKm = Math.max(parseFloat(c.distance_km ?? c.distanceKm ?? 1), 0.1);
      const rating = parseFloat(c.rating ?? 5.0);
      const acceptanceRate = parseFloat(c.acceptanceRate ?? 0.85);
      const cancellationRate = parseFloat(c.cancellationRate ?? 0.05);

      // 1. Normalized feature components (0 to 1)
      const etaScore = Math.min(1.0, 1.0 / Math.max(1.0, etaMin));
      const distanceScore = Math.min(1.0, 1.0 / Math.max(1.0, distanceKm));
      const ratingScore = Math.min(1.0, Math.max(0.0, rating / 5.0));
      const acceptanceScore = Math.min(1.0, Math.max(0.0, acceptanceRate));
      const cancellationScore = Math.min(1.0, Math.max(0.0, 1.0 - cancellationRate));
      const idleScore = calculateIdleScore(c.lastTripEndedAt, c.lastSeenAt);

      const directionScore = (pickupLat != null && pickupLng != null && c.currentLat != null && c.currentLng != null)
        ? calculateDirectionAlignment(
            parseFloat(c.currentLat),
            parseFloat(c.currentLng),
            c.heading,
            parseFloat(pickupLat),
            parseFloat(pickupLng)
          )
        : 0.5;

      const priorityBonus = c.priorityMatching ? PRIORITY_MATCHING_BONUS : 0.0;

      // 2. Weighted total score
      const rawScore =
        (activeWeights.etaWeight || 0.40) * etaScore +
        (activeWeights.distanceWeight || 0.15) * distanceScore +
        (activeWeights.idleWeight || 0.10) * idleScore +
        (activeWeights.ratingWeight || 0.10) * ratingScore +
        (activeWeights.acceptanceRateWeight || 0.10) * acceptanceScore +
        (activeWeights.cancellationRateWeight || 0.05) * cancellationScore +
        (activeWeights.directionWeight || 0.05) * directionScore +
        priorityBonus;

      const finalScore = Math.round(rawScore * 100000) / 100000;

      const scoreBreakdown = {
        etaMin,
        distanceKm,
        etaScore: Math.round(etaScore * 1000) / 1000,
        distanceScore: Math.round(distanceScore * 1000) / 1000,
        idleScore: Math.round(idleScore * 1000) / 1000,
        ratingScore: Math.round(ratingScore * 1000) / 1000,
        acceptanceScore: Math.round(acceptanceScore * 1000) / 1000,
        cancellationScore: Math.round(cancellationScore * 1000) / 1000,
        directionScore: Math.round(directionScore * 1000) / 1000,
        priorityBonus,
        weightsUsed: activeWeights,
        totalScore: finalScore,
      };

      return {
        ...c,
        _score: finalScore,
        score: finalScore,
        scoreBreakdown,
      };
    })
    .sort((a, b) => b._score - a._score);
}
