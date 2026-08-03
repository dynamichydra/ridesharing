import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as rideService from './ride.service.js';
import { signalRideAccepted, signalRideCancelled } from '../matching/matching.service.js';

export async function rideRoutes(app) {

  // ── Rider ─────────────────────────────────────────────────────────────────

  // POST /api/v1/rides
  app.post('/', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { vehicleTypeId, pickupLat, pickupLng, pickupAddress, dropLat, dropLng, dropAddress } = request.body;
    if (!vehicleTypeId || !pickupLat || !pickupLng || !dropLat || !dropLng) {
      return sendError(reply, 'vehicleTypeId, pickupLat, pickupLng, dropLat, dropLng are required');
    }
    const data = await rideService.requestRide({ riderId: request.user.id, ...request.body });
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/rides/:id
  app.get('/:id', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await rideService.getRideById(request.params.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/cancel  (rider)
  // Fix 3: call signalRideCancelled so matching loop aborts immediately
  app.post('/:id/cancel', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await rideService.cancelRideByRider(request.params.id, request.user.id, request.body.reason);
    // Signal matching engine to abort ring search immediately
    await signalRideCancelled(request.params.id).catch(() => { });
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/rate
  app.post('/:id/rate', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { rating, review } = request.body;
    if (!rating || rating < 1 || rating > 5) return sendError(reply, 'rating must be between 1 and 5');
    const data = await rideService.rateDriver(request.params.id, request.user.id, rating, review);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rides/:id/offers — full broadcast history (rider sees own ride)
  app.get('/:id/offers', { preHandler: [authenticateRider] }, async (request, reply) => {
    const ride = await rideService.getRideById(request.params.id);
    if (ride.riderId !== request.user.id) return sendError(reply, 'Not your ride', 403);
    const data = await rideService.getRideOffers(request.params.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rides/:id/history — full status timeline (rider sees own ride)
  app.get('/:id/history', { preHandler: [authenticateRider] }, async (request, reply) => {
    const ride = await rideService.getRideById(request.params.id);
    if (ride.riderId !== request.user.id) return sendError(reply, 'Not your ride', 403);
    const data = await rideService.getRideStatusTimeline(request.params.id);
    return sendSuccess(reply, data);
  });

  // ── Driver ────────────────────────────────────────────────────────────────

  // POST /api/v1/rides/:id/accept
  // Fix 2: signal matching engine via pub/sub after DB update
  app.post('/:id/accept', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.acceptRide(request.params.id, request.user.id);
    // Signal matching engine: pub/sub resolves waitForAcceptanceSignal immediately
    await signalRideAccepted(request.params.id).catch(() => { });
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/arriving
  app.post('/:id/arriving', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.markArriving(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/start  — driver must submit the OTP the rider shared
  app.post('/:id/start', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { otp } = request.body || {};
    if (!otp) return sendError(reply, 'otp is required');
    const data = await rideService.startRide(request.params.id, request.user.id, otp);
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

  // POST /api/v1/rides/:id/decline  (driver explicitly declines an offer)
  app.post('/:id/decline', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.declineOffer(request.params.id, request.user.id, request.body?.reason);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rides/driver/active
  app.get('/driver/active', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.getDriverActiveRide(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rides/driver/offers — driver's own offer inbox (paginated)
  app.get('/driver/offers', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await rideService.getMyOffers(
      request.user.id, page, limit, offset, request.query.status,
    );
    return sendList(reply, rows, pagination);
  });

  // ── Admin ─────────────────────────────────────────────────────────────────

  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      status: request.query.status,
      driverId: request.query.driverId,
      riderId: request.query.riderId,
      countryId: request.query.countryId,
    };
    const { rows, pagination } = await rideService.listAllRides(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/rides/:id/offers/admin — admin can view any ride's offers
  app.get('/:id/offers/admin', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await rideService.getRideOffers(request.params.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/rides/:id/history/admin — admin can view any ride's timeline
  app.get('/:id/history/admin', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await rideService.getRideStatusTimeline(request.params.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/cancel/admin — support/ops cancels a stuck or disputed ride
  app.post('/:id/cancel/admin', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await rideService.cancelRideByAdmin(request.params.id, request.user.id, request.body?.reason);
    await signalRideCancelled(request.params.id).catch(() => { });
    return sendSuccess(reply, data);
  });
}