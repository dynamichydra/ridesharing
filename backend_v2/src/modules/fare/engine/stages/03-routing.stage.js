import { getRouteData } from '../../../../utils/maps.js';

/**
 * Stage 3: Google Maps Route & Traffic Analysis.
 */
export async function executeRoutingStage(context) {
  const { pickupLat, pickupLng, dropLat, dropLng } = context.request;

  const route = await getRouteData(
    parseFloat(pickupLat), parseFloat(pickupLng),
    parseFloat(dropLat),   parseFloat(dropLng),
  );

  context.route = {
    distanceKm: parseFloat(route.distanceKm.toFixed(3)),
    durationMin: route.durationMin,
    durationInTrafficMin: route.durationInTrafficMin,
    trafficDelayS: route.trafficDelayS || 0,
    polyline: route.polyline,
    decodedPath: route.decodedPath,
    bounds: route.bounds,
  };

  return context;
}
