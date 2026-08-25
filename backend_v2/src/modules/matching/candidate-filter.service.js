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
export function validateLocationFreshness(driver, maxAgeSec = 60) {
  const now = Date.now();
  let updatedAtMs = null;

  if (driver.updatedAt) {
    updatedAtMs = new Date(driver.updatedAt).getTime();
  } else if (driver.lastSeenAt) {
    updatedAtMs = new Date(driver.lastSeenAt).getTime();
  }

  if (!updatedAtMs) {
    return { valid: true, ageSec: 0, quality: 'acceptable' };
  }

  const ageSec = Math.max(0, Math.floor((now - updatedAtMs) / 1000));

  if (ageSec > maxAgeSec) {
    return {
      valid: false,
      ageSec,
      quality: 'unavailable',
      reason: `Location is ${ageSec}s old (exceeds limit of ${maxAgeSec}s)`,
    };
  }

  let quality = 'excellent';
  if (ageSec > 30) quality = 'degraded';
  else if (ageSec > 15) quality = 'acceptable';
  else if (ageSec > 5) quality = 'good';

  return { valid: true, ageSec, quality };
}

/**
 * Checks candidate cooldown in Redis.
 */
export async function isDriverOnCooldown(rideId, driverId) {
  const cooldownKey = `dispatch:cooldown:${rideId}:${driverId}`;
  const exists = await redis.exists(cooldownKey);
  return exists === 1;
}

/**
 * Sets candidate cooldown after an offer expires or gets rejected.
 */
export async function setDriverCooldown(rideId, driverId, ttlSec = 60) {
  const cooldownKey = `dispatch:cooldown:${rideId}:${driverId}`;
  await redis.setex(cooldownKey, ttlSec, '1');
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
  if (!candidates || candidates.length === 0) {
    return { eligible: [], excluded: [] };
  }

  const maxLocationAge = policy.maxLocationAgeSeconds || 60;
  const riderId = ride.riderId;
  const rideId = ride.id;
  const requiredSeats = ride.passengerCount || 1;
  const requestedVehicleTypeId = ride.vehicleTypeId;

  // 1. Fetch blocked drivers for this rider in one batch
  const driverIds = candidates.map((c) => c.id);
  const blockedRows = await db.execute(sql`
    SELECT driver_id AS "driverId"
    FROM driver_rider_blocks
    WHERE rider_id = ${riderId}::uuid
      AND driver_id IN (${sql.join(driverIds.map((id) => sql`${id}::uuid`), sql`, `)})
  `);
  const blockedDriverSet = new Set(blockedRows.rows.map((r) => r.driverId));

  // 2. Fetch vehicle type seat capacity metadata if needed
  let vehicleTypeCache = {};
  if (requestedVehicleTypeId) {
    const vTypes = await db.select().from(vehicleTypes);
    vTypes.forEach((vt) => { vehicleTypeCache[vt.id] = vt; });
  }

  const eligible = [];
  const excluded = [];

  for (const driver of candidates) {
    // A. Online & Account Status
    if (!driver.isOnline) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_OFFLINE });
      continue;
    }

    if (driver.isBlocked || driver.status === 'suspended') {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_SUSPENDED });
      continue;
    }

    if (driver.approvalStatus !== 'approved') {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_UNAPPROVED });
      continue;
    }

    // B. Driver-Rider Block List
    if (blockedDriverSet.has(driver.id)) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.RISK_BLOCKED, details: 'Driver blocked by rider' });
      continue;
    }

    // C. Active Ride & Distributed Lock Check
    const [activeRideRaw, activeLock] = await Promise.all([
      redis.get(REDIS_KEYS.driverRideActive(driver.id)),
      redis.get(REDIS_KEYS.driverOfferLock(driver.id)),
    ]);

    if (activeRideRaw) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_BUSY, details: 'Driver already on active trip' });
      continue;
    }

    if (activeLock && activeLock !== rideId) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.DRIVER_BUSY, details: 'Driver currently locked by another ride' });
      continue;
    }

    // D. Candidate Cooldown Check
    const onCooldown = await isDriverOnCooldown(rideId, driver.id);
    if (onCooldown) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.COOLDOWN, details: 'Driver recently rejected or timed out on this ride' });
      continue;
    }

    // E. Location Freshness Check
    const freshness = validateLocationFreshness(driver, maxLocationAge);
    if (!freshness.valid) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.LOCATION_STALE, details: freshness.reason });
      continue;
    }

    // F. Vehicle Type & Capacity Check
    if (requestedVehicleTypeId && driver.vehicleTypeId && driver.vehicleTypeId !== requestedVehicleTypeId) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.WRONG_VEHICLE, details: 'Vehicle type does not match requested type' });
      continue;
    }

    const vtMeta = vehicleTypeCache[driver.vehicleTypeId || requestedVehicleTypeId];
    if (vtMeta && vtMeta.capacity && vtMeta.capacity < requiredSeats) {
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
          excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.ROUTE_MISMATCH, details: 'Trip is not on driver destination path' });
          continue;
        }
      }
    } catch (err) {
      // destination mode check error non-fatal
    }

    // H. Scheduled Reservation Conflicts
    const isReserved = await isDriverReservedForTime(driver.id, new Date(), 45);
    if (isReserved) {
      excluded.push({ driverId: driver.id, name: driver.name, reason: EXCLUSION_REASONS.RESERVATION_CONFLICT, details: 'Driver reserved for scheduled booking' });
      continue;
    }

    eligible.push({
      ...driver,
      locationFreshnessSec: freshness.ageSec,
      locationQuality: freshness.quality,
    });
  }

  return { eligible, excluded };
}
