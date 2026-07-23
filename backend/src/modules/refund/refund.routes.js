import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as refundService from './refund.service.js';

export async function refundRoutes(app) {

  // POST /api/v1/refunds  { paymentId, amountMinor, reason }
  // Admin-only — no self-service refunds in this phase. Requires an Idempotency-Key header
  // so a retried/double-submitted request returns the original result instead of refunding
  // twice.
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
