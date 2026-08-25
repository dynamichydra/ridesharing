import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateDriver, authenticateAdmin, authenticateAny } from '../../middleware/authenticate.js';
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

  // POST /api/v1/rides/schedule
  app.post('/schedule', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { vehicleTypeId, pickupLat, pickupLng, dropLat, dropLng, scheduledAt } = request.body || {};
    if (!vehicleTypeId || !pickupLat || !pickupLng || !dropLat || !dropLng || !scheduledAt) {
      return sendError(reply, 'vehicleTypeId, pickupLat, pickupLng, dropLat, dropLng, scheduledAt are required', 400);
    }
    const data = await rideService.requestRide({ riderId: request.user.id, ...request.body, scheduledAt });
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/rides/scheduled/mine
  app.get('/scheduled/mine', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await rideService.listMyScheduledRides(request.user.id);
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/rides/scheduled/:id
  app.delete('/scheduled/:id', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await rideService.cancelScheduledRide(request.params.id, request.user.id);
    return sendSuccess(reply, data);
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

  // GET /api/v1/rides/:id/receipt
  app.get('/:id/receipt', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await rideService.getRideReceipt(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/rate
  app.post('/:id/rate', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { rating, review } = request.body || {};
    if (!rating || rating < 1 || rating > 5) return sendError(reply, 'rating must be between 1 and 5');
    const data = await rideService.rateDriver(request.params.id, request.user.id, rating, review);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/rate-rider (driver rates rider)
  app.post('/:id/rate-rider', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { rating, review } = request.body || {};
    if (!rating || rating < 1 || rating > 5) return sendError(reply, 'rating must be between 1 and 5');
    const data = await rideService.rateRider(request.params.id, request.user.id, rating, review);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/tip (rider tips driver)
  app.post('/:id/tip', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { tipAmountMinor } = request.body || {};
    if (!tipAmountMinor || tipAmountMinor <= 0) return sendError(reply, 'tipAmountMinor must be a positive integer');
    const data = await rideService.tipDriver(request.params.id, request.user.id, tipAmountMinor);
    return sendSuccess(reply, data);
  });

  // ── In-Trip Chat ───────────────────────────────────────────────────────────
  // GET /api/v1/rides/:id/messages
  app.get('/:id/messages', { preHandler: [authenticateAny] }, async (request, reply) => {
    const { getRideMessages } = await import('./chat.service.js');
    const data = await getRideMessages(request.params.id, request.user.id, request.user.role);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/messages
  app.post('/:id/messages', { preHandler: [authenticateAny] }, async (request, reply) => {
    const { content, messageType } = request.body || {};
    if (!content) return sendError(reply, 'content is required');
    const { sendMessage } = await import('./chat.service.js');
    const data = await sendMessage({
      rideId: request.params.id,
      senderId: request.user.id,
      senderRole: request.user.role,
      content,
      messageType,
    });
    return sendSuccess(reply, data, 201);
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

  // POST /api/v1/rides/:id/arrived (driver reached pickup point)
  app.post('/:id/arrived', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.markDriverArrived(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/rides/:id/no-show (driver declares passenger no-show after waiting)
  app.post('/:id/no-show', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await rideService.cancelNoShow(request.params.id, request.user.id, request.body?.reason);
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