import { redis, REDIS_KEYS } from '../../config/redis.js';
import { moment } from '../../utils/time.js';

const DESTINATION_KEY = (driverId) => `driver:destination_mode:${driverId}`;

/**
 * Calculates straight-line distance in kilometers using the Haversine formula.
 */
export function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks whether a ride's drop-off point progresses towards the driver's destination.
 */
export function isTripOnDriverRoute(driverDestination, pickupLat, pickupLng, dropLat, dropLng) {
  if (!driverDestination || !driverDestination.lat || !driverDestination.lng) return true;

  const destLat = parseFloat(driverDestination.lat);
  const destLng = parseFloat(driverDestination.lng);
  const pLat = parseFloat(pickupLat);
  const pLng = parseFloat(pickupLng);
  const dLat = parseFloat(dropLat);
  const dLng = parseFloat(dropLng);

  const distPickupToDest = calculateHaversineKm(pLat, pLng, destLat, destLng);
  const distDropToDest = calculateHaversineKm(dLat, dLng, destLat, destLng);

  // Qualifies if drop-off is closer to target destination than pickup, OR within driver's tolerance radius
  const toleranceKm = driverDestination.radiusKm || 10;
  return distDropToDest <= toleranceKm || distDropToDest < distPickupToDest;
}

/**
 * Set driver destination mode.
 */
export async function setDestinationMode(driverId, { lat, lng, address, radiusKm = 10, durationHours = 2 }) {
  if (!lat || !lng) {
    throw { statusCode: 400, message: 'lat and lng are required' };
  }

  const durationSec = Math.min(Math.max(durationHours, 1), 8) * 3600;
  const expiresAt = moment().add(durationSec, 'seconds').toISOString();

  const data = {
    driverId,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    address: address || 'Target Destination',
    radiusKm: parseFloat(radiusKm) || 10,
    expiresAt,
  };

  await redis.setex(DESTINATION_KEY(driverId), durationSec, JSON.stringify(data));

  return {
    enabled: true,
    destination: data,
  };
}

/**
 * Get active destination mode.
 */
export async function getDestinationMode(driverId) {
  const raw = await redis.get(DESTINATION_KEY(driverId));
  if (!raw) return { enabled: false, destination: null };

  try {
    const data = JSON.parse(raw);
    return { enabled: true, destination: data };
  } catch {
    return { enabled: false, destination: null };
  }
}

/**
 * Clear destination mode.
 */
export async function clearDestinationMode(driverId) {
  await redis.del(DESTINATION_KEY(driverId));
  return { enabled: false, destination: null };
}
