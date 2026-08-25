import { redis } from '../../config/redis.js';
import { getEtaMatrix } from '../../utils/maps.js';
import { latLngToHexCell } from '../../utils/h3.js';

/**
 * ETA & Routing Service for Driver Matching
 *
 * Provides batched ETA resolution with a multi-tiered fallback:
 * 1. Redis Short-lived Geohash/H3 Cell ETA Cache (TTL 30s)
 * 2. Real Map Provider (Google Maps / Distance Matrix API)
 * 3. Fallback Haversine + Urban Traffic Model (Circuit-breaker safe)
 */

const ETA_CACHE_TTL_SEC = 30;
const DEFAULT_URBAN_SPEED_KMH = 25.0; // conservative 25 km/h in city traffic

/**
 * Generates an H3 cell-based cache key for pickup-driver pairs.
 */
function getEtaCacheKey(pickupLat, pickupLng, driverLat, driverLng) {
  const pickupCell = latLngToHexCell(pickupLat, pickupLng, 8);
  const driverCell = latLngToHexCell(driverLat, driverLng, 8);
  return `eta:cache:${pickupCell}:${driverCell}`;
}

/**
 * Computes Haversine distance in km between two coordinates.
 */
export function calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Fallback ETA calculator based on road network winding factor (1.35x) and urban speed.
 */
export function calculateEstimatedEta(pickupLat, pickupLng, driverLat, driverLng, speedKmh = DEFAULT_URBAN_SPEED_KMH) {
  const straightLineKm = calculateHaversineDistanceKm(pickupLat, pickupLng, driverLat, driverLng);
  const estimatedRoadKm = straightLineKm * 1.35; // 35% urban detour factor
  const etaMinutes = (estimatedRoadKm / speedKmh) * 60;
  return {
    distanceKm: Math.round(estimatedRoadKm * 100) / 100,
    etaMin: Math.max(1.0, Math.round(etaMinutes * 10) / 10),
    etaSeconds: Math.max(60, Math.round(etaMinutes * 60)),
    source: 'fallback_estimate',
  };
}

/**
 * Resolves ETAs for a batch of candidate drivers to a single pickup point.
 *
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {Array<Object>} candidates Candidate drivers with currentLat, currentLng
 * @returns {Promise<Array<Object>>} Candidates enriched with etaMin, etaSeconds, distanceKm
 */
export async function calculateCandidateEtas(pickupLat, pickupLng, candidates) {
  if (!candidates || candidates.length === 0) return [];

  // Check cache for each candidate
  const uncachedIndices = [];
  const results = new Array(candidates.length);

  await Promise.all(
    candidates.map(async (driver, idx) => {
      const driverLat = parseFloat(driver.currentLat);
      const driverLng = parseFloat(driver.currentLng);

      if (isNaN(driverLat) || isNaN(driverLng)) {
        results[idx] = { etaMin: 5.0, etaSeconds: 300, distanceKm: 2.0, source: 'default' };
        return;
      }

      const cacheKey = getEtaCacheKey(pickupLat, pickupLng, driverLat, driverLng);
      try {
        const cachedRaw = await redis.get(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          results[idx] = { ...cached, source: 'cache' };
          return;
        }
      } catch (err) {
        // Cache read error non-fatal
      }

      uncachedIndices.push(idx);
    })
  );

  // If all were cached, return immediately
  if (uncachedIndices.length === 0) {
    return candidates.map((c, i) => ({ ...c, ...results[i] }));
  }

  // Fetch routing for uncached destinations via Map API with graceful fallback
  const uncachedDestinations = uncachedIndices.map((i) => ({
    lat: parseFloat(candidates[i].currentLat),
    lng: parseFloat(candidates[i].currentLng),
  }));

  try {
    const routingResults = await getEtaMatrix(pickupLat, pickupLng, uncachedDestinations);

    await Promise.all(
      uncachedIndices.map(async (origIdx, apiIdx) => {
        const driver = candidates[origIdx];
        const res = routingResults[apiIdx] || {};
        const etaMin = parseFloat(res.etaMin) || calculateEstimatedEta(
          pickupLat, pickupLng,
          parseFloat(driver.currentLat), parseFloat(driver.currentLng)
        ).etaMin;

        const distanceKm = parseFloat(driver.distance_km || driver.distanceKm || res.distanceKm || 1.0);
        const etaSeconds = Math.round(etaMin * 60);

        const etaData = {
          etaMin: Math.max(0.5, etaMin),
          etaSeconds,
          distanceKm,
          source: 'routing_matrix',
        };

        results[origIdx] = etaData;

        // Populate cache
        const cacheKey = getEtaCacheKey(
          pickupLat, pickupLng,
          parseFloat(driver.currentLat), parseFloat(driver.currentLng)
        );
        redis.setex(cacheKey, ETA_CACHE_TTL_SEC, JSON.stringify(etaData)).catch(() => {});
      })
    );
  } catch (err) {
    console.warn('[Matching/ETA] Real-time routing provider failed, using fallback estimate:', err.message);

    // Fallback for uncached items
    uncachedIndices.forEach((origIdx) => {
      const driver = candidates[origIdx];
      const fallback = calculateEstimatedEta(
        pickupLat, pickupLng,
        parseFloat(driver.currentLat), parseFloat(driver.currentLng)
      );
      results[origIdx] = fallback;
    });
  }

  return candidates.map((c, i) => ({
    ...c,
    ...results[i],
  }));
}
