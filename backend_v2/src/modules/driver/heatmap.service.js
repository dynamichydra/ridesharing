import { eq, and, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { zones, rides, drivers } from '../../../drizzle/schema/index.js';
import { calculateHaversineKm } from './destination-mode.service.js';

/**
 * Returns demand heatmap clusters for drivers to visualize high-demand zones.
 */
export async function getDriverHeatmap({ lat = null, lng = null, cityId = null, maxDistanceKm = 50 } = {}) {
  // 1. Fetch active pricing and surge zones
  const query = db.select().from(zones).where(eq(zones.isActive, true));
  const activeZones = await query;

  // 2. Fetch active unassigned rides (demand)
  const searchingRides = await db.select({
    id: rides.id,
    pickupLat: rides.pickupLat,
    pickupLng: rides.pickupLng,
  }).from(rides).where(eq(rides.status, 'searching'));

  // 3. Fetch online drivers (supply)
  const onlineDrivers = await db.select({
    id: drivers.id,
    currentLat: drivers.currentLat,
    currentLng: drivers.currentLng,
  }).from(drivers).where(eq(drivers.isOnline, true));

  const driverLat = lat ? parseFloat(lat) : null;
  const driverLng = lng ? parseFloat(lng) : null;

  const clusters = activeZones.map((zone) => {
    // Parse zone polygon / center
    let centerLat = 0;
    let centerLng = 0;
    let pointCount = 0;

    if (zone.polygon && Array.isArray(zone.polygon.coordinates)) {
      const coords = zone.polygon.coordinates[0] || zone.polygon.coordinates;
      for (const pt of coords) {
        if (Array.isArray(pt) && pt.length >= 2) {
          centerLng += pt[0];
          centerLat += pt[1];
          pointCount++;
        }
      }
    }

    if (pointCount > 0) {
      centerLat /= pointCount;
      centerLng /= pointCount;
    } else {
      // Default fallback
      centerLat = driverLat || 28.6139;
      centerLng = driverLng || 77.2090;
    }

    // Calculate distance from driver if driver coordinates provided
    const distanceKm = driverLat && driverLng
      ? Math.round(calculateHaversineKm(driverLat, driverLng, centerLat, centerLng) * 10) / 10
      : null;

    // Approximate demand & supply inside or near the zone radius (e.g. 5km)
    const demandCount = searchingRides.filter((r) => {
      if (!r.pickupLat || !r.pickupLng) return false;
      const d = calculateHaversineKm(parseFloat(r.pickupLat), parseFloat(r.pickupLng), centerLat, centerLng);
      return d <= 6;
    }).length;

    const supplyCount = onlineDrivers.filter((d) => {
      if (!d.currentLat || !d.currentLng) return false;
      const dist = calculateHaversineKm(parseFloat(d.currentLat), parseFloat(d.currentLng), centerLat, centerLng);
      return dist <= 6;
    }).length;

    const surgeMultiplier = parseFloat(zone.surgeMultiplier || '1.0');
    let demandLevel = 'LOW';
    if (surgeMultiplier > 1.2 || (demandCount > supplyCount && demandCount >= 3)) {
      demandLevel = 'HIGH';
    } else if (surgeMultiplier > 1.0 || demandCount > 0) {
      demandLevel = 'MEDIUM';
    }

    return {
      zoneId: zone.id,
      name: zone.name,
      type: zone.type,
      center: { lat: centerLat, lng: centerLng },
      polygon: zone.polygon,
      surgeMultiplier: String(surgeMultiplier.toFixed(2)),
      demandCount,
      supplyCount,
      demandLevel, // HIGH | MEDIUM | LOW
      distanceKm,
    };
  });

  // Filter by distance if driver location provided
  const filteredClusters = driverLat && driverLng
    ? clusters.filter((c) => c.distanceKm == null || c.distanceKm <= maxDistanceKm)
    : clusters;

  return {
    clusters: filteredClusters,
    totalOnlineDrivers: onlineDrivers.length,
    totalSearchingRides: searchingRides.length,
    generatedAt: new Date().toISOString(),
  };
}
