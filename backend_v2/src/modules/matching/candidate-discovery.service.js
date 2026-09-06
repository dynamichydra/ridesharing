import { sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { getCandidateDriverIds as getH3CandidateDriverIds } from './driver-geo-index.service.js';
import { getSupplyDemandRatio } from './supply-demand.service.js';

/**
 * Candidate Discovery Service
 *
 * Discovers candidate drivers around pickup coordinates using a hybrid
 * Redis GEO / H3 cell lookup and dynamically computes matching radius
 * based on city density, time of day, and real-time supply/demand.
 */

export const DEFAULT_RADIUS_KM = 1.5;
export const MAX_RADIUS_KM = 15.0;

/**
 * Computes an adaptive initial and maximum search radius.
 * When supply is scarce (low driver-to-rider ratio), radius expands faster.
 */
export async function calculateDynamicRadius({
  pickupLat,
  pickupLng,
  cityDensity = 'medium', // high | medium | low | rural
  serviceType = 'economy',
  policy = null,
}) {
  if (policy && policy.initialRadiusKm) {
    return {
      initialRadiusKm: parseFloat(policy.initialRadiusKm),
      maxRadiusKm: parseFloat(policy.maxRadiusKm || MAX_RADIUS_KM),
      radiusStepKm: parseFloat(policy.radiusStepKm || 2.0),
    };
  }

  // Base radii by city density
  let baseInitial = 1.5;
  let baseMax = 12.0;

  if (cityDensity === 'high') {
    baseInitial = 1.0;
    baseMax = 8.0;
  } else if (cityDensity === 'low' || cityDensity === 'rural') {
    baseInitial = 3.0;
    baseMax = 20.0;
  }

  // Service-specific adjustments
  if (serviceType === 'premium' || serviceType === 'xl' || serviceType === 'wheelchair') {
    baseInitial *= 1.5;
    baseMax *= 1.5;
  }

  // Supply-demand adjustment
  try {
    const ratio = await getSupplyDemandRatio(pickupLat, pickupLng);
    if (ratio < 0.5) {
      // High demand, low supply -> widen search radius immediately
      baseInitial *= 1.4;
    } else if (ratio > 2.0) {
      // High supply -> keep search tight to find closest driver quickly
      baseInitial *= 0.85;
    }
  } catch (err) {
    // Non-fatal, use base
  }

  return {
    initialRadiusKm: Math.round(baseInitial * 10) / 10,
    maxRadiusKm: Math.round(baseMax * 10) / 10,
    radiusStepKm: 2.0,
  };
}

/**
 * Discovers nearby driver IDs and fetches raw driver records with real-time location.
 *
 * @param {number} pickupLat
 * @param {number} pickupLng
 * @param {number} radiusKm
 * @param {Array<string>} excludedDriverIds
 * @returns {Promise<Array<Object>>} Raw driver candidates
 */
export async function discoverCandidatesInRadius(pickupLat, pickupLng, radiusKm, excludedDriverIds = []) {
  // 1. Fetch H3 cell driver pool (bounded spatial index)
  let candidateIds = await getH3CandidateDriverIds(pickupLat, pickupLng, radiusKm);
  console.log({ candidateIds });

  // 2. Fallback to Redis GEO if H3 pool is empty or not yet warmed
  if (candidateIds.length === 0) {
    try {
      // Redis GEORADIUS or GEOSEARCH fallback
      const geoResults = await redis.geosearch(
        'geo:drivers:available',
        'FROMLONLAT',
        pickupLng,
        pickupLat,
        'BYRADIUS',
        radiusKm,
        'KM',
        'WITHDIST',
        'WITHCOORD',
        'COUNT',
        100,
        'ASC'
      );
      if (Array.isArray(geoResults)) {
        candidateIds = geoResults.map((r) => (Array.isArray(r) ? r[0] : r).replace(/^driver:/, ''));
      }
    } catch (err) {
      // Redis geosearch might not be populated; rely on Postgres H3 fallback
    }
  }

  // If exclusions provided, remove them from ID pool
  if (excludedDriverIds.length > 0) {
    const excludeSet = new Set(excludedDriverIds);
    candidateIds = candidateIds.filter((id) => !excludeSet.has(id));
  }

  // 3. Fetch driver details with spatial distance calculation from Postgres
  // If candidateIds has matches, prioritize them; otherwise query all online active drivers directly within the radius
  const whereClause = candidateIds.length > 0
    ? sql`
        d.id IN (${sql.join(candidateIds.map((id) => sql`${id}::uuid`), sql`, `)})
        AND d.current_lat IS NOT NULL
        AND (6371 * acos(
          LEAST(1.0,
            cos(radians(${pickupLat})) * cos(radians(d.current_lat::float))
            * cos(radians(d.current_lng::float) - radians(${pickupLng}))
            + sin(radians(${pickupLat})) * sin(radians(d.current_lat::float))
          )
        )) <= ${radiusKm}
      `
    : sql`
        d.is_online = true
        AND d.status != 'suspended'
        AND d.is_blocked = false
        AND d.current_lat IS NOT NULL
        ${excludedDriverIds.length > 0 ? sql`AND d.id NOT IN (${sql.join(excludedDriverIds.map((id) => sql`${id}::uuid`), sql`, `)})` : sql``}
        AND (6371 * acos(
          LEAST(1.0,
            cos(radians(${pickupLat})) * cos(radians(d.current_lat::float))
            * cos(radians(d.current_lng::float) - radians(${pickupLng}))
            + sin(radians(${pickupLat})) * sin(radians(d.current_lat::float))
          )
        )) <= ${radiusKm}
      `;

  const rows = await db.execute(sql`
    SELECT
      d.id,
      d.name,
      d.phone,
      d.email,
      d.status,
      d.approval_status      AS "approvalStatus",
      d.is_online            AS "isOnline",
      d.is_blocked           AS "isBlocked",
      d.rating,
      d.total_rides          AS "totalRides",
      d.total_ratings        AS "totalRatings",
      d.profile_photo        AS "profilePhoto",
      d.fcm_token            AS "fcmToken",
      d.vehicle_type_id      AS "vehicleTypeId",
      d.vehicle_number       AS "vehicleNumber",
      d.vehicle_model        AS "vehicleModel",
      d.current_lat::float   AS "currentLat",
      d.current_lng::float   AS "currentLng",
      d.updated_at           AS "updatedAt",
      d.last_location_at     AS "lastSeenAt",
      sp.priority_matching   AS "priorityMatching",
      ROUND(
        (6371 * acos(
          LEAST(1.0,
            cos(radians(${pickupLat})) * cos(radians(d.current_lat::float))
            * cos(radians(d.current_lng::float) - radians(${pickupLng}))
            + sin(radians(${pickupLat})) * sin(radians(d.current_lat::float))
          )
        ))::numeric, 3
      ) AS distance_km
    FROM drivers d
    LEFT JOIN subscriptions s ON s.driver_id = d.id
      AND s.status = 'active'
      AND (s.end_date IS NULL OR s.end_date > NOW())
    LEFT JOIN subscription_plans sp ON sp.id = s.plan_id
    WHERE ${whereClause}
    ORDER BY distance_km ASC
    LIMIT 50
  `);

  // Enrich Postgres records with live Redis location / timestamp if available
  const enrichedCandidates = await Promise.all(
    rows.rows.map(async (driver) => {
      try {
        const [locRaw, hexRaw] = await Promise.all([
          redis.get(REDIS_KEYS.driverLocation(driver.id)),
          redis.get(REDIS_KEYS.driverHexCurrent(driver.id)),
        ]);

        let liveUpdatedAt = null;
        if (locRaw) {
          const parsed = JSON.parse(locRaw);
          if (parsed?.lat != null && parsed?.lng != null) {
            driver.currentLat = parseFloat(parsed.lat);
            driver.currentLng = parseFloat(parsed.lng);
          }
          if (parsed?.updatedAt) {
            liveUpdatedAt = new Date(parsed.updatedAt).toISOString();
          }
        }
        if (!liveUpdatedAt && hexRaw) {
          const parsedHex = JSON.parse(hexRaw);
          if (parsedHex?.updatedAt) {
            liveUpdatedAt = new Date(parsedHex.updatedAt).toISOString();
          }
        }

        if (liveUpdatedAt) {
          driver.lastSeenAt = liveUpdatedAt;
          driver.lastLocationAt = liveUpdatedAt;
        }
      } catch (err) {
        // non-fatal
      }
      return driver;
    })
  );

  console.log(`[CandidateDiscovery] Discovered ${enrichedCandidates.length} candidate(s) within ${radiusKm}km.`);
  return enrichedCandidates;
}
