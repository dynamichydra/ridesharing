import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as rideService from './ride.service.js';

export async function rideRoutes(app) {

  // ── Rider ─────────────────────────────────────────────────────────────────

  // POST /api/v1/rides  — request a ride
  app.post('/', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { vehicleTypeId, pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress } = request.body;
    if (!vehicleTypeId || !pickupLat || !pickupLng || !dropLat || !dropLng) {
      return sendError(reply, 'vehicleTypeId, pickupLat, pickupLng, dropLat, dropLng are required');
    }
    const data = await rideService.requestRide({ riderId: request.user.id, ...request.body });
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/rides/:id/track
  app.get('/:id/track', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await rideService.trackRide(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/cancel  (rider)
  app.post('/:id/cancel', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await rideService.cancelRideByRider(request.params.id, request.user.id, request.body.reason);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/rate
  app.post('/:id/rate', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { rating, review } = request.body;
    if (!rating || rating < 1 || rating > 5) return sendError(reply, 'rating must be 1-5');
    const data = await rideService.rateDriver(request.params.id, request.user.id, rating, review);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rides/:id  (rider sees own ride)
  app.get('/:id', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await rideService.getRideById(request.params.id);
    return sendSuccess(reply, data);
  });

  // ── Driver ────────────────────────────────────────────────────────────────

  // POST /api/v1/rides/:id/accept
  app.post('/:id/accept', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.acceptRide(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/arriving
  app.post('/:id/arriving', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.markArriving(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/start
  app.post('/:id/start', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.startRide(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/complete
  app.post('/:id/complete', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.completeRide(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/driver-cancel
  app.post('/:id/driver-cancel', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.cancelRideByDriver(request.params.id, request.user.id, request.body.reason);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rides/driver/active
  app.get('/driver/active', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.getDriverActiveRide(request.user.id);
    return sendSuccess(reply, data);
  });

  // ── Admin ─────────────────────────────────────────────────────────────────

  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      status:   request.query.status,
      driverId: request.query.driverId,
      riderId:  request.query.riderId,
    };
    const { rows, pagination } = await rideService.listAllRides(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });
}
