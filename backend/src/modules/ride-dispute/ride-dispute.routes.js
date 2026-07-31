import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAny, authenticateAdmin } from '../../middleware/authenticate.js';
import * as rideDisputeService from './ride-dispute.service.js';

// Rider/driver-facing complaint tickets against a ride — see drizzle/schema/ride-disputes.js
// for why this is deliberately separate from the processor-chargeback `disputes` module.
export async function rideDisputeRoutes(app) {

  // POST /api/v1/ride-disputes  { rideId, reason, description }
  app.post('/', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await rideDisputeService.raiseDispute(request.user, request.body);
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/ride-disputes/mine?page=&limit=
  app.get('/mine', { preHandler: [authenticateAny] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await rideDisputeService.getMyRideDisputes(request.user, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // POST /api/v1/ride-disputes/:id/respond  { responseText } — the ride's *other* party only
  app.post('/:id/respond', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await rideDisputeService.respondToDispute(request.user, request.params.id, request.body.responseText);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/ride-disputes/:id — either ride participant, or an admin
  app.get('/:id', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await rideDisputeService.getRideDispute(request.params.id, request.user);
    return sendSuccess(reply, data);
  });

  // ── Admin ─────────────────────────────────────────────────────────────────────

  // GET /api/v1/ride-disputes?status=&rideId=&page=&limit=
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { status: request.query.status, rideId: request.query.rideId };
    const { rows, pagination } = await rideDisputeService.listRideDisputes(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // PATCH /api/v1/ride-disputes/:id  { status: 'resolved'|'rejected', adminNotes }
  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await rideDisputeService.resolveRideDispute(request.params.id, request.user.id, request.body);
    return sendSuccess(reply, data);
  });
}
