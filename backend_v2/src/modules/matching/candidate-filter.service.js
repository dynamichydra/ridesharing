import { db } from '../../config/db.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { sql } from 'drizzle-orm';
import { driverRiderBlocks, vehicleTypes } from '../../../drizzle/schema/index.js';
import { isDriverReservedForTime } from './driver-reservation.service.js';
import { getDestinationMode, isTripOnDriverRoute } from '../driver/destination-mode.service.js';

/**
 * Standardized exclusion reasons
 */
export const EXCLUSION_REASONS = Object.freeze({
  DRIVER_OFFLINE: 'DRIVER_OFFLINE',
  DRIVER_BUSY: 'DRIVER_BUSY',
  DRIVER_SUSPENDED: 'DRIVER_SUSPENDED',
  DRIVER_UNAPPROVED: 'DRIVER_UNAPPROVED',
  LOCATION_STALE: 'LOCATION_STALE',
  LOCATION_INVALID: 'LOCATION_INVALID',
  WRONG_SERVICE: 'WRONG_SERVICE',
  WRONG_VEHICLE: 'WRONG_VEHICLE',
  CAPACITY_EXCEEDED: 'CAPACITY_EXCEEDED',
  REGION_NOT_ALLOWED: 'REGION_NOT_ALLOWED',
  DOCUMENT_INVALID: 'DOCUMENT_INVALID',
  RESERVATION_CONFLICT: 'RESERVATION_CONFLICT',
  AIRPORT_QUEUE_RULE: 'AIRPORT_QUEUE_RULE',
  COOLDOWN: 'COOLDOWN',
  RISK_BLOCKED: 'RISK_BLOCKED',
  ROUTE_MISMATCH: 'ROUTE_MISMATCH',
});

/**
 * Evaluates GPS location freshness and quality.
 * Returns { valid: boolean, ageSec: number, quality: string, reason?: string }
 */
export function validateLocationFreshness(driver, maxAgeSec = 900) {
  const now = Date.now();
  let updatedAtMs = null;
  // Only evaluate genuine GPS location timestamps (avoid generic profile row updatedAt)
  const locationTimestamp = driver.lastSeenAt || driver.lastLocationAt || driver.recordedAt || driver.locationUpdatedAt;

  if (locationTimestamp) {
    updatedAtMs = new Date(locationTimestamp).getTime();
  }

  if (!updatedAtMs || isNaN(updatedAtMs)) {
    console.log(`[CandidateFilter:LocationFreshness] Driver ${driver.id} (${driver.name || 'Unknown'}): No GPS timestamp found, default valid (acceptable)`);
    return { valid: true, ageSec: 0, quality: 'acceptable' };
  }

  const ageSec = Math.max(0, Math.floor((now - updatedAtMs) / 1000));

  if (ageSec > maxAgeSec) {
    const reason = `Location is ${ageSec}s old (exceeds limit of ${maxAgeSec}s)`;
    console.log(`[CandidateFilter:LocationFreshness] Driver ${driver.id} (${driver.name || 'Unknown'}): STALE (${reason})`);
    return {
      valid: false,
      ageSec,
      quality: 'unavailable',
      reason,
    };
  }

  let quality = 'excellent';
  if (ageSec > 30) quality = 'degraded';
  else if (ageSec > 15) quality = 'acceptable';
  else if (ageSec > 5) quality = 'good';

  console.log(`[CandidateFilter:LocationFreshness] Driver ${driver.id} (${driver.name || 'Unknown'}): Valid (${ageSec}s old, quality: ${quality})`);
  return { valid: true, ageSec, quality };
}

/**
 * Checks candidate cooldown in Redis.
 */
export async function isDriverOnCooldown(rideId, driverId) {
  const cooldownKey = `dispatch:cooldown:${rideId}:${driverId}`;
  const exists = await redis.exists(cooldownKey);
  const onCooldown = exists === 1;
  console.log(`[CandidateFilter:Cooldown] Check cooldown for driver ${driverId} on ride ${rideId}: ${onCooldown ? 'ON COOLDOWN' : 'CLEAR'}`);
  return onCooldown;
}

/**
 * Sets candidate cooldown after an offer expires or gets rejected.
 */
export async function setDriverCooldown(rideId, driverId, ttlSec = 60) {
  const cooldownKey = `dispatch:cooldown:${rideId}:${driverId}`;
  await redis.setex(cooldownKey, ttlSec, '1');
  console.log(`[CandidateFilter:Cooldown] Set cooldown for driver ${driverId} on ride ${rideId} (TTL: ${ttlSec}s)`);
}

/**
 * Main candidate filtering pipeline.
 *
 * @param {Array<Object>} candidates Raw driver candidate rows
 * @param {Object} ride Ride request details
 * @param {Object} policy Matching policy configuration
 * @returns {Promise<{ eligible: Array<Object>, excluded: Array<Object> }>}
 */
export async function filterCandidates(candidates, ride, policy = {}) {
  console.log(`\n=================== [CandidateFilter: START] ===================`);
  console.log(`[CandidateFilter] Ride ID: ${ride?.id}, Rider ID: ${ride?.riderId}, Requested Vehicle Type: ${ride?.vehicleTypeId || 'Any'}, Seats: ${ride?.passengerCount || 1}`);
  console.log(`[CandidateFilter] Total initial candidates to evaluate: ${candidates?.length || 0}`);

  if (!candidates || candidates.length === 0) {
    console.log(`[CandidateFilter] No candidates provided to filter. Returning empty.`);
    console.log(`=================== [CandidateFilter: END] ===================\n`);
    return { eligible: [], excluded: [] };
  }

  const maxLocationAge = policy.maxLocationAgeSeconds || 900;
  const riderId = ride.riderId;
  const rideId = ride.id;
  const requiredSeats = ride.passengerCount || 1;
  const requestedVehicleTypeId = ride.vehicleTypeId;

  // 1. Fetch blocked drivers for this rider in one batch
  console.log(`[CandidateFilter:Step 1] Checking driver-rider block list for rider ${riderId}...`);
  const driverIds = candidates.map((c) => c.id);
  const blockedRows = await db.execute(sql`
    SELECT driver_id AS "driverId"
    FROM driver_rider_blocks
    WHERE rider_id = ${riderId}::uuid
      AND driver_id IN (${sql.join(driverIds.map((id) => sql`${id}::uuid`), sql`, `)})
  `);
  const blockedDriverSet = new Set(blockedRows.rows.map((r) => r.driverId));
  console.log(`[CandidateFilter:Step 1] Blocked drivers count for rider ${riderId}: ${blockedDriverSet.size}`);

  // 2. Fetch vehicle type seat capacity metadata if needed
  let vehicleTypeCache = {};
  if (requestedVehicleTypeId) {
    console.log(`[CandidateFilter:Step 2] Loading vehicle types metadata...`);
    const vTypes = await db.select().from(vehicleTypes);
    vTypes.forEach((vt) => { vehicleTypeCache[vt.id] = vt; });
    console.log(`[CandidateFilter:Step 2] Loaded ${Object.keys(vehicleTypeCache).length} vehicle types.`);
  }

  const eligible = [];
  const excluded = [];

  console.log(`[CandidateFilter:Step 3] Evaluating individual candidates...`);

  for (let i = 0; i < candidates.length; i++) {
    const driver = candidates[i];
    console.log(`\n--- [CandidateFilter] [${i + 1}/${candidates.length}] Evaluating Driver: ${driver.id} (${driver.name || 'Unknown'}) ---`);

    // A. Online & Account Status
    if (!driver.isOnline) {
      console.log(`  -> EXCLUDED: Driver is offline (isOnline=${driver.isOnline})`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_OFFLINE });
      continue;
    }

    if (driver.isBlocked || driver.status === 'suspended') {
      console.log(`  -> EXCLUDED: Driver suspended or blocked (isBlocked=${driver.isBlocked}, status=${driver.status})`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_SUSPENDED });
      continue;
    }

    if (driver.approvalStatus !== 'approved') {
      console.log(`  -> EXCLUDED: Driver unapproved (approvalStatus=${driver.approvalStatus})`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_UNAPPROVED });
      continue;
    }

    // B. Driver-Rider Block List
    if (blockedDriverSet.has(driver.id)) {
      console.log(`  -> EXCLUDED: Driver is in rider's block list`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.RISK_BLOCKED, details: 'Driver blocked by rider' });
      continue;
    }

    // C. Active Ride & Distributed Lock Check
    const [activeRideRaw, activeLock] = await Promise.all([
      redis.get(REDIS_KEYS.driverRideActive(driver.id)),
      redis.get(REDIS_KEYS.driverOfferLock(driver.id)),
    ]);

    if (activeRideRaw) {
      console.log(`  -> EXCLUDED: Driver already on active trip (activeRideRaw=${activeRideRaw})`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_BUSY, details: 'Driver already on active trip' });
      continue;
    }

    if (activeLock && activeLock !== rideId) {
      console.log(`  -> EXCLUDED: Driver currently locked by another ride offer (${activeLock})`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_BUSY, details: 'Driver currently locked by another ride' });
      continue;
    }

    // D. Candidate Cooldown Check
    const onCooldown = await isDriverOnCooldown(rideId, driver.id);
    if (onCooldown) {
      console.log(`  -> EXCLUDED: Driver is on cooldown for ride ${rideId}`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.COOLDOWN, details: 'Driver recently rejected or timed out on this ride' });
      continue;
    }

    // E. Location Freshness Check
    const freshness = validateLocationFreshness(driver, maxLocationAge);
    if (!freshness.valid) {
      console.log(`  -> EXCLUDED: Location stale (${freshness.reason})`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.LOCATION_STALE, details: freshness.reason });
      continue;
    }

    // F. Vehicle Type & Capacity Check
    if (requestedVehicleTypeId && driver.vehicleTypeId && driver.vehicleTypeId !== requestedVehicleTypeId) {
      console.log(`  -> EXCLUDED: Vehicle type mismatch (Driver type: ${driver.vehicleTypeId}, Requested: ${requestedVehicleTypeId})`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.WRONG_VEHICLE, details: 'Vehicle type does not match requested type' });
      continue;
    }

    const vtMeta = vehicleTypeCache[driver.vehicleTypeId || requestedVehicleTypeId];
    if (vtMeta && vtMeta.capacity && vtMeta.capacity < requiredSeats) {
      console.log(`  -> EXCLUDED: Capacity exceeded (Vehicle capacity ${vtMeta.capacity} < Required ${requiredSeats})`);
      excluded.push({
        driverId: driver.id,
        name: driver.name,
        reason: EXCLUSION_REASONS.CAPACITY_EXCEEDED,
        details: `Vehicle seat capacity (${vtMeta.capacity}) < requested passengers (${requiredSeats})`,
      });
      continue;
    }

    // G. Driver Destination Mode (Route Alignment)
    try {
      const destMode = await getDestinationMode(driver.id).catch(() => ({ enabled: false }));
      if (destMode.enabled && destMode.destination && ride.dropLat && ride.dropLng) {
        const onRoute = isTripOnDriverRoute(
          destMode.destination,
          ride.pickupLat,
          ride.pickupLng,
          ride.dropLat,
          ride.dropLng
        );
        if (!onRoute) {
          console.log(`  -> EXCLUDED: Route mismatch (Destination mode enabled, trip not on route)`);
          excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.ROUTE_MISMATCH, details: 'Trip is not on driver destination path' });
          continue;
        }
      }
    } catch (err) {
      console.log(`  [CandidateFilter:DestinationMode] Non-fatal check error for driver ${driver.id}:`, err?.message || err);
    }

    // H. Scheduled Reservation Conflicts
    const isReserved = await isDriverReservedForTime(driver.id, new Date(), 45);
    if (isReserved) {
      console.log(`  -> EXCLUDED: Reservation conflict (Driver reserved for scheduled booking)`);
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.RESERVATION_CONFLICT, details: 'Driver reserved for scheduled booking' });
      continue;
    }

    console.log(`  -> PASSED: Driver ${driver.id} (${driver.name || 'Unknown'}) is ELIGIBLE (Location age: ${freshness.ageSec}s, quality: ${freshness.quality})`);
    eligible.push({
      ...driver,
      locationFreshnessSec: freshness.ageSec,
      locationQuality: freshness.quality,
    });
  }

  console.log(`\n=================== [CandidateFilter: SUMMARY] ===================`);
  console.log(`[CandidateFilter] Total Candidates: ${candidates.length} | Eligible: ${eligible.length} | Excluded: ${excluded.length}`);
  if (excluded.length > 0) {
    console.log(`[CandidateFilter] Excluded Breakdown:`, JSON.stringify(excluded, null, 2));
  }
  if (eligible.length > 0) {
    console.log(`[CandidateFilter] Eligible Drivers:`, eligible.map(d => ({ id: d.id, name: d.name, vehicleTypeId: d.vehicleTypeId })));
  }
  console.log(`==================================================================\n`);

  return { eligible, excluded };
}
