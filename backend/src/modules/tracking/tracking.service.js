/**
 * src/modules/tracking/tracking.service.js
 *
 * Handles two distinct tracking phases:
 *
 * PHASE 1 — APPROACH  (status: accepted | arriving)
 *   Driver is traveling from their current position to the pickup point.
 *   • On acceptRide → compute driver→pickup route, store in Redis.
 *   • On each location_update → recompute remaining ETA, publish to rider.
 *
 * PHASE 2 — TRIP  (status: started)
 *   Driver + rider traveling from pickup to drop.
 *   • On startRide → route already known (stored at ride creation), decode path.
 *   • On each location_update → compute covered/remaining km + ETA, publish to rider.
 */

import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rides, drivers } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import {
  getRouteData, decodePolyline,
  computeRouteProgress
} from '../../utils/maps.js';
import { haversineKm } from '../../utils/geo.js';

// ── Approach phase ─────────────────────────────────────────────────────────────

/**
 * Called immediately after a driver accepts a ride.
 * Computes the route from driver's current location → pickup point.
 * Stores result in Redis and pushes it to the rider's socket room.
 *
 * @param {object} ride    — full ride row
 * @param {object} driver  — { id, currentLat, currentLng, name, vehicleNumber, vehicleModel, rating, profilePhoto }
 */
export async function computeApproachRoute(ride, driver) {
  const driverLat = parseFloat(driver.currentLat);
  const driverLng = parseFloat(driver.currentLng);
  const pickupLat = parseFloat(ride.pickupLat);
  const pickupLng = parseFloat(ride.pickupLng);

  let routeData;
  try {
    routeData = await getRouteData(driverLat, driverLng, pickupLat, pickupLng);
  } catch (err) {
    // Non-fatal — fallback to haversine straight-line
    console.warn('[Tracking] Approach route fallback (Maps error):', err.message);
    const distanceKm = haversineKm(driverLat, driverLng, pickupLat, pickupLng);
    const durationMin = Math.ceil((distanceKm / 20) * 60);
    routeData = {
      distanceKm, durationMin, durationInTrafficMin: durationMin,
      trafficDelayS: 0, polyline: null, decodedPath: [], bounds: null
    };
  }

  const approachData = {
    phase: 'approach',
    rideId: ride.id,
    driverId: driver.id,
    riderId: ride.riderId,
    from: { lat: driverLat, lng: driverLng },
    to: { lat: pickupLat, lng: pickupLng, address: ride.pickupAddress },
    distanceKm: routeData.distanceKm,
    etaMin: routeData.durationInTrafficMin,
    polyline: routeData.polyline,
    decodedPath: routeData.decodedPath,
    bounds: routeData.bounds,
    computedAt: Date.now(),
  };

  // Cache in Redis — TTL 1 hour
  await redis.setex(
    REDIS_KEYS.rideApproachRoute(ride.id),
    3600,
    JSON.stringify(approachData),
  );

  // Push to rider via Kafka → Socket.IO bridge
  await publishEvent(TOPICS.DRIVER_LOCATION, {
    id: ride.id,
    rideId: ride.id,
    riderId: ride.riderId,
    driverId: driver.id,
    phase: 'approach',
    lat: driverLat,
    lng: driverLng,
    approachRoute: {
      distanceKm: routeData.distanceKm,
      etaMin: routeData.durationInTrafficMin,
      polyline: routeData.polyline,
      bounds: routeData.bounds,
    },
    driver: {
      name: driver.name,
      vehicleNumber: driver.vehicleNumber,
      vehicleModel: driver.vehicleModel,
      rating: driver.rating,
      profilePhoto: driver.profilePhoto,
    },
  }, ride.id);

  return approachData;
}

/**
 * Called on every driver location_update while status = accepted | arriving.
 * Recomputes remaining distance + ETA to pickup, publishes to rider.
 */
export async function updateApproachProgress(rideId, riderId, driverId, driverLat, driverLng) {
  const raw = await redis.get(REDIS_KEYS.rideApproachRoute(rideId));
  if (!raw) return; // route not yet computed or expired

  const route = JSON.parse(raw);
  const pickupLat = route.to.lat;
  const pickupLng = route.to.lng;

  // Real-time remaining distance (haversine, no Maps API call — too expensive per ping)
  const remainingKm = haversineKm(driverLat, driverLng, pickupLat, pickupLng);
  // Estimate ETA based on remaining distance and original speed profile
  const originalSpeed = route.distanceKm > 0
    ? (route.distanceKm / Math.max(route.etaMin, 1)) // km per min
    : 0.4; // fallback ~25 km/h
  const etaMin = Math.ceil(remainingKm / originalSpeed);

  await publishEvent(TOPICS.DRIVER_LOCATION, {
    id: rideId,
    rideId,
    riderId,
    driverId,
    phase: 'approach',
    lat: driverLat,
    lng: driverLng,
    approachProgress: {
      remainingKm: parseFloat(remainingKm.toFixed(3)),
      etaMin,
    },
  }, rideId);
}

// ── Trip phase ─────────────────────────────────────────────────────────────────

/**
 * Called when driver starts the ride.
 * Decodes the stored pickup→drop polyline so we have the path for progress tracking.
 * Stores trip context in Redis.
 */
export async function initTripTracking(ride) {
  const decodedPath = ride.polyline ? decodePolyline(ride.polyline) : [];

  const tripData = {
    phase: 'trip',
    rideId: ride.id,
    riderId: ride.riderId,
    driverId: ride.driverId,
    totalDistanceKm: parseFloat(ride.distanceKm),
    estimatedDurationMin: ride.durationMin,
    polyline: ride.polyline,
    decodedPath,
    startedAt: Date.now(),
    from: { lat: parseFloat(ride.pickupLat), lng: parseFloat(ride.pickupLng), address: ride.pickupAddress },
    to: { lat: parseFloat(ride.dropLat), lng: parseFloat(ride.dropLng), address: ride.dropAddress },
  };

  await redis.setex(
    REDIS_KEYS.rideProgress(ride.id),
    7200,
    JSON.stringify(tripData),
  );

  return tripData;
}

/**
 * Called on every driver location_update while status = started.
 * Computes covered km, remaining km, progress %, remaining ETA.
 * Publishes full progress snapshot to rider.
 */
export async function updateTripProgress(rideId, riderId, driverId, driverLat, driverLng) {
  const raw = await redis.get(REDIS_KEYS.rideProgress(rideId));
  if (!raw) return;

  const trip = JSON.parse(raw);
  const { decodedPath, totalDistanceKm, estimatedDurationMin, startedAt } = trip;

  const progress = computeRouteProgress(driverLat, driverLng, decodedPath, totalDistanceKm);

  // ETA: use proportion of remaining distance vs original estimate
  const speed = totalDistanceKm > 0 ? totalDistanceKm / Math.max(estimatedDurationMin, 1) : 0.4;
  const etaMin = Math.ceil(progress.remainingKm / speed);
  const elapsedMin = Math.floor((Date.now() - startedAt) / 60_000);

  const snapshot = {
    id: rideId,
    rideId,
    riderId,
    driverId,
    phase: 'trip',
    lat: driverLat,
    lng: driverLng,
    tripProgress: {
      coveredKm: progress.coveredKm,
      remainingKm: progress.remainingKm,
      totalKm: totalDistanceKm,
      progressPct: progress.progressPct,
      etaMin,
      elapsedMin,
      nearestPathIdx: progress.nearestIdx,
    },
  };

  // Publish via Kafka → Socket.IO bridge delivers to rider room
  await publishEvent(TOPICS.DRIVER_LOCATION, snapshot, rideId);

  // Also update Redis progress snapshot (so REST /track can read it)
  const updated = { ...trip, lastProgress: snapshot.tripProgress, lastDriverPos: { lat: driverLat, lng: driverLng } };
  await redis.setex(REDIS_KEYS.rideProgress(rideId), 7200, JSON.stringify(updated));
}

/**
 * REST endpoint helper — returns current ride tracking state.
 * Combines ride row + Redis progress/approach data + driver live position.
 */
export async function getRideTrackingState(rideId, riderId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== riderId) throw { statusCode: 403, message: 'Not your ride' };

  // Driver live position from Redis
  let driverPosition = null;
  if (ride.driverId) {
    const locRaw = await redis.get(REDIS_KEYS.driverLocation(ride.driverId));
    driverPosition = locRaw ? JSON.parse(locRaw) : null;
  }

  // Phase-specific context
  let approachRoute = null;
  let tripProgress = null;

  if (['accepted', 'arriving'].includes(ride.status)) {
    const raw = await redis.get(REDIS_KEYS.rideApproachRoute(rideId));
    if (raw) {
      const d = JSON.parse(raw);
      approachRoute = {
        distanceKm: d.distanceKm,
        etaMin: d.etaMin,
        polyline: d.polyline,
        bounds: d.bounds,
        from: d.from,
        to: d.to,
        computedAt: d.computedAt,
      };
    }
  }

  if (ride.status === 'started') {
    const raw = await redis.get(REDIS_KEYS.rideProgress(rideId));
    if (raw) {
      const d = JSON.parse(raw);
      tripProgress = {
        ...d.lastProgress,
        polyline: d.polyline,
        bounds: null,
        from: d.from,
        to: d.to,
        startedAt: d.startedAt,
        totalDistanceKm: d.totalDistanceKm,
      };
    }
  }

  return {
    ride: {
      id: ride.id,
      status: ride.status,
      pickupAddress: ride.pickupAddress,
      dropAddress: ride.dropAddress,
      estimatedFare: ride.estimatedFare,
      finalFare: ride.finalFare,
      distanceKm: ride.distanceKm,
      durationMin: ride.durationMin,
      polyline: ride.polyline,         // pickup→drop full polyline
      requestedAt: ride.requestedAt,
      acceptedAt: ride.acceptedAt,
      startedAt: ride.startedAt,
    },
    driverPosition,
    approachRoute,
    tripProgress,
  };
}

/**
 * Cleanup Redis keys after ride is completed or cancelled.
 */
export async function cleanupRideTracking(rideId) {
  await Promise.all([
    redis.del(REDIS_KEYS.rideProgress(rideId)),
    redis.del(REDIS_KEYS.rideApproachRoute(rideId)),
  ]);
}
