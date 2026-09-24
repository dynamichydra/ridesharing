import { getRouteData } from '../../../../utils/maps.js';

/**
 * Stage 3: Google Maps Route & Traffic Analysis.
 */
export async function executeRoutingStage(context) {
  const { pickupLat, pickupLng, dropLat, dropLng, precomputedRoute } = context.request;

  const route = precomputedRoute || await getRouteData(
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
