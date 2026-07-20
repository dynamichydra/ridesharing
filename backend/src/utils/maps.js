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

const mapsClient = new Client({});

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
    console.log("CALLLLLLLLLLL");
    
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
