import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateRider, authenticateDriver } from '../../middleware/authenticate.js';
import { getRideTrackingState } from './tracking.service.js';

export async function trackingRoutes(app) {

  /**
   * GET /api/v1/tracking/:rideId
   * Full tracking state — ride details, driver live position,
   * approach route (when accepted/arriving) or trip progress (when started).
   * Called by rider app to render the map.
   */
  app.get('/:rideId', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await getRideTrackingState(request.params.rideId, request.user.id);
    return sendSuccess(reply, data);
  });

  /**
   * GET /api/v1/tracking/:rideId/driver
   * Driver-facing: returns the current ride context (pickup coords + drop coords)
   * so the driver app can show their route overlay.
   */
  app.get('/:rideId/driver', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { getRideById } = await import('../ride/ride.service.js');
    const ride = await getRideById(request.params.rideId);
    if (ride.driverId !== request.user.id) return sendError(reply, 'Not your ride', 403);
    return sendSuccess(reply, {
      rideId: ride.id,
      status: ride.status,
      pickup: { lat: ride.pickupLat, lng: ride.pickupLng, address: ride.pickupAddress },
      drop: { lat: ride.dropLat, lng: ride.dropLng, address: ride.dropAddress },
      polyline: ride.polyline,   // pickup → drop
      estimatedFare: ride.estimatedFare,
      distanceKm: ride.distanceKm,
      durationMin: ride.durationMin,
    });
  });
}
