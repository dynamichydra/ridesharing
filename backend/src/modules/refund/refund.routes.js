import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin, authenticateRider } from '../../middleware/authenticate.js';
import * as refundService from './refund.service.js';

export async function refundRoutes(app) {

  // ── Rider self-service — request only, admin approval executes the real refund ──

  // POST /api/v1/refunds/request  { rideId, reason }
  // Creates a 'requested' row for the ride's latest payment (full remaining refundable
  // amount) — no gateway call happens until an admin approves it via PATCH /:id/approve.
  app.post('/request', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { rideId, reason } = request.body;
    const data = await refundService.requestRefund(request.user.id, { rideId, reason });
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/refunds/mine?page=&limit=
  app.get('/mine', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await refundService.getMyRefunds(request.user.id, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // ── Admin ─────────────────────────────────────────────────────────────────────

  // PATCH /api/v1/refunds/:id/approve — reviews + executes a rider's refund request
  app.patch('/:id/approve', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await refundService.approveRefundRequest(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/refunds/:id/reject  { rejectionReason }
  app.patch('/:id/reject', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await refundService.rejectRefundRequest(request.params.id, request.user.id, request.body.rejectionReason);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/refunds  { paymentId, amountMinor, reason }
  // Admin-initiated, instant — bypasses the rider request/approval flow above (e.g. a
  // goodwill refund an admin decides on unprompted). Requires an Idempotency-Key header so a
  // retried/double-submitted request returns the original result instead of refunding twice.
  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { paymentId, amountMinor, reason } = request.body;
    if (!paymentId || !amountMinor) return sendError(reply, 'paymentId and amountMinor are required');
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return sendError(reply, 'Idempotency-Key header is required', 400);
    const data = await refundService.initiateRefund({
      paymentId, amountMinor, reason, initiatedById: request.user.id, idempotencyKey,
    });
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/refunds?paymentId=&status=&page=&limit=
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { paymentId: request.query.paymentId, status: request.query.status };
    const { rows, pagination } = await refundService.listRefunds(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/refunds/:id
  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await refundService.getRefund(request.params.id);
    return sendSuccess(reply, data);
  });
}
