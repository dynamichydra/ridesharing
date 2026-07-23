/**
 * src/utils/maps.js
 *
 * Single place for all Google Maps API calls.
 * Every other module imports from here — no duplicated Client instances.
 *
 * Exported functions:
 *   getRouteData(originLat, originLng, destLat, destLng)
 *     → { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline, bounds }
 *
 *   getRouteDataMulti(waypoints[])
 *     → same shape but for multi-stop (approach + trip legs)
 *
 *   decodePolyline(encoded)
 *     → [ {lat, lng}, … ]  (pure JS, no API call)
 *
 *   snapToRoads(points[])     (optional — requires Roads API)
 */

import { Client } from '@googlemaps/google-maps-services-js';
import { haversineKm } from './geo.js';
import { env } from '../config/env.js';
import { metrics } from './metrics.js';

const mapsClient = new Client({});

// Google Distance Matrix's per-request destination cap — callers of getEtaMatrix
// must keep their candidate pool at or below this.
export const ETA_MATRIX_MAX_DESTINATIONS = 25;

// ── internal ──────────────────────────────────────────────────────────────────

async function _distancematrix(origin, destination) {
  try {
    const res = await mapsClient.distancematrix({
      params: {
        origins: [origin],
        destinations: [destination],
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: env.GOOGLE_MAPS_KEY,
      },
    });
    return res.data.rows[0].elements[0];
  } catch (error) {
    console.log(error);
    throw error;
    
  }
  
}

async function _directions(origin, destination) {
  try {
    const res = await mapsClient.directions({
      params: {
        origin,
        destination,
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: env.GOOGLE_MAPS_KEY,
      },
    });
    const route = res.data.routes[0];
    return route || null;
  } catch (error) {
    console.log(error);
    throw error;
    
  }
  
}

// ── public ────────────────────────────────────────────────────────────────────

/**
 * Full route data between two points.
 *
 * Falls back to Haversine estimate when GOOGLE_MAPS_KEY is not set (dev/test).
 *
 * @returns {Promise<{
 *   distanceKm: number,
 *   durationMin: number,
 *   durationInTrafficMin: number,
 *   trafficDelayS: number,
 *   polyline: string|null,        Google encoded polyline
 *   decodedPath: Array<{lat,lng}> decoded path points
 *   bounds: {northeast,southwest}|null
 * }>}
 */
export async function getRouteData(originLat, originLng, destLat, destLng) {
  if (!env.GOOGLE_MAPS_KEY) {
    metrics.routingFallbackTotal.inc({ source: 'route' });

    // Dev fallback — straight-line estimate
    const distanceKm = haversineKm(originLat, originLng, destLat, destLng);
    const durationMin = Math.ceil((distanceKm / 25) * 60); // 25 km/h avg city speed
    return {
      distanceKm,
      durationMin,
      durationInTrafficMin: durationMin,
      trafficDelayS: 0,
      polyline: null,
      decodedPath: [{ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng }],
      bounds: null,
    };
  }

  const origin = `${originLat},${originLng}`;
  const destination = `${destLat},${destLng}`;

  const [element, route] = await Promise.all([
    _distancematrix(origin, destination),
    _directions(origin, destination).catch(() => null),
  ]);

  if (element.status !== 'OK') {
    throw { statusCode: 422, message: 'Could not calculate route between given coordinates' };
  }

  const distanceKm = element.distance.value / 1000;
  const durationMin = Math.ceil(element.duration.value / 60);
  const durationInTrafficMin = element.duration_in_traffic
    ? Math.ceil(element.duration_in_traffic.value / 60)
    : durationMin;
  const trafficDelayS = element.duration_in_traffic
    ? Math.max(0, element.duration_in_traffic.value - element.duration.value)
    : 0;

  const polyline = route?.overview_polyline?.points ?? null;
  const decodedPath = polyline ? decodePolyline(polyline) : [
    { lat: originLat, lng: originLng }, { lat: destLat, lng: destLng },
  ];
  const bounds = route?.bounds ?? null;

  return { distanceKm, durationMin, durationInTrafficMin, trafficDelayS, polyline, decodedPath, bounds };
}

/**
 * Real, traffic-aware ETA to multiple candidate drivers in a SINGLE Distance
 * Matrix call (one origin, many destinations) — used by matching's scoring step
 * instead of straight-line distance. This keeps routing cost at one API call per
 * matching ring regardless of candidate count, rather than one call per candidate,
 * which would multiply cost by up to MAX_CANDIDATES-buffer at hyper-scale volume.
 *
 * Falls back to a Haversine+flat-speed estimate per destination (same degraded
 * path as getRouteData) when GOOGLE_MAPS_KEY is unset — logged as degraded so
 * matching quality regressions in that mode are visible, not silent.
 *
 * @param {Array<{lat:number,lng:number}>} destinations — capped to ETA_MATRIX_MAX_DESTINATIONS
 * @returns {Promise<Array<{etaMin:number, distanceKm:number, degraded:boolean}>>} same order as `destinations`
 */
export async function getEtaMatrix(originLat, originLng, destinations) {
  if (destinations.length > ETA_MATRIX_MAX_DESTINATIONS) {
    throw new Error(`getEtaMatrix: ${destinations.length} destinations exceeds cap of ${ETA_MATRIX_MAX_DESTINATIONS}`);
  }
  if (destinations.length === 0) return [];

  if (!env.GOOGLE_MAPS_KEY) {
    console.warn('[Maps] getEtaMatrix degraded: GOOGLE_MAPS_KEY unset, using Haversine+flat-speed fallback');
    metrics.routingFallbackTotal.inc({ source: 'eta_matrix' }, destinations.length);
    return destinations.map((d) => {
      const distanceKm = haversineKm(originLat, originLng, d.lat, d.lng);
      return { etaMin: Math.ceil((distanceKm / 25) * 60), distanceKm, degraded: true };
    });
  }

  try {
    const res = await mapsClient.distancematrix({
      params: {
        origins: [`${originLat},${originLng}`],
        destinations: destinations.map((d) => `${d.lat},${d.lng}`),
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: env.GOOGLE_MAPS_KEY,
      },
    });
    const elements = res.data.rows[0].elements;
    return elements.map((el, i) => {
      if (el.status !== 'OK') {
        metrics.routingFallbackTotal.inc({ source: 'eta_matrix' });
        const distanceKm = haversineKm(originLat, originLng, destinations[i].lat, destinations[i].lng);
        return { etaMin: Math.ceil((distanceKm / 25) * 60), distanceKm, degraded: true };
      }
      const durationS = el.duration_in_traffic?.value ?? el.duration.value;
      return {
        etaMin: Math.ceil(durationS / 60),
        distanceKm: el.distance.value / 1000,
        degraded: false,
      };
    });
  } catch (error) {
    console.error('[Maps] getEtaMatrix failed, falling back to Haversine for entire batch:', error.message);
    metrics.routingFallbackTotal.inc({ source: 'eta_matrix' }, destinations.length);
    return destinations.map((d) => {
      const distanceKm = haversineKm(originLat, originLng, d.lat, d.lng);
      return { etaMin: Math.ceil((distanceKm / 25) * 60), distanceKm, degraded: true };
    });
  }
}

/**
 * Decode a Google Maps encoded polyline into an array of {lat, lng} objects.
 * Pure JS — no API call needed.
 */
export function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

/**
 * Given a driver's current position and the decoded path of the full route,
 * find the nearest point on the route and return:
 *   coveredKm      — distance already travelled along the route
 *   remainingKm    — distance still to go
 *   progressPct    — 0-100
 *   nearestIdx     — index into decodedPath of the nearest point
 */
export function computeRouteProgress(driverLat, driverLng, decodedPath, totalDistanceKm) {
  if (!decodedPath || decodedPath.length < 2) {
    return { coveredKm: 0, remainingKm: totalDistanceKm, progressPct: 0, nearestIdx: 0 };
  }

  // Find nearest point on path to driver's current location
  let nearestIdx = 0;
  let nearestDist = Infinity;
  for (let i = 0; i < decodedPath.length; i++) {
    const d = haversineKm(driverLat, driverLng, decodedPath[i].lat, decodedPath[i].lng);
    if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
  }

  // Sum segment lengths up to nearest point
  let coveredKm = 0;
  for (let i = 0; i < nearestIdx; i++) {
    coveredKm += haversineKm(
      decodedPath[i].lat, decodedPath[i].lng,
      decodedPath[i + 1].lat, decodedPath[i + 1].lng,
    );
  }

  const remainingKm = Math.max(0, totalDistanceKm - coveredKm);
  const progressPct = Math.min(100, Math.round((coveredKm / totalDistanceKm) * 100));

  return { coveredKm: parseFloat(coveredKm.toFixed(3)), remainingKm: parseFloat(remainingKm.toFixed(3)), progressPct, nearestIdx };
}

/**
 * Actual billed distance for a completed trip, derived from GPS pings rather
 * than the upfront estimate. This is polyline-projection (nearest point on the
 * PLANNED route, reusing computeRouteProgress above), not true snap-to-road —
 * a real map-matching engine (Google Roads API / self-hosted OSRM/Valhalla
 * `match`) is a deferred infra decision, flagged in the README, not silently
 * presented as full map-matching.
 *
 * Walks non-noise pings in chronological order and tracks the MONOTONIC max
 * progress-so-far along the route, so GPS jitter (a ping landing slightly
 * "behind" the previous one) can't cause double-counted back-and-forth distance.
 * A ping flagged as following a large time gap doesn't get bridged with a
 * straight line — its progress is still computed against the real planned
 * route, which is a closer estimate than Haversine-connecting the gap.
 *
 * @param {Array<{lat:number,lng:number,isNoise?:boolean,gapFlag?:boolean}>} pings — chronological order
 */
export function computeCumulativeTripDistance(pings, decodedPath, totalDistanceKm) {
  if (!decodedPath || decodedPath.length < 2 || !pings?.length) {
    return { actualDistanceKm: 0, gapCount: 0, usablePingCount: 0 };
  }

  let maxCoveredKm = 0;
  let gapCount = 0;
  let usablePingCount = 0;

  for (const ping of pings) {
    if (ping.isNoise) continue;
    usablePingCount++;
    if (ping.gapFlag) gapCount++;
    const { coveredKm } = computeRouteProgress(ping.lat, ping.lng, decodedPath, totalDistanceKm);
    if (coveredKm > maxCoveredKm) maxCoveredKm = coveredKm;
  }

  return { actualDistanceKm: parseFloat(maxCoveredKm.toFixed(3)), gapCount, usablePingCount };
}
