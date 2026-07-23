import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as payoutService from './payout.service.js';

// Admin-only — no self-service payout triggering.
export async function payoutRoutes(app) {

  // POST /api/v1/payouts/instant  { driverId }
  // Requires an Idempotency-Key header so a retried/double-submitted request pays out once,
  // not twice.
  app.post('/instant', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { driverId } = request.body;
    if (!driverId) return sendError(reply, 'driverId is required');
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return sendError(reply, 'Idempotency-Key header is required', 400);
    const data = await payoutService.initiateInstantPayout(driverId, request.user.id, idempotencyKey);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/payouts/batch/:gateway — manual trigger alongside the scheduled weekly job
  app.post('/batch/:gateway', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await payoutService.runPayoutBatch(request.params.gateway);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/payouts?driverId=&status=&batchId=&page=&limit=
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      driverId: request.query.driverId, status: request.query.status, batchId: request.query.batchId,
    };
    const { rows, pagination } = await payoutService.listPayouts(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/payouts/batches
  app.get('/batches', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await payoutService.listBatches(page, limit, offset);
    return sendList(reply, rows, pagination);
  });
}
