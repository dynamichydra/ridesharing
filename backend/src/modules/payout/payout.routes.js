import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin, authenticateDriver } from '../../middleware/authenticate.js';
import * as payoutService from './payout.service.js';

export async function payoutRoutes(app) {

  // ── Driver self-service ───────────────────────────────────────────────────────

  // POST /api/v1/payouts/me/instant — pays out the calling driver's own wallet balance.
  // Same eligibility rules as the admin-triggered instant payout (approved payout account,
  // positive balance, gateway supports payouts) — see payout.service.js selectEligiblePayout.
  // Requires an Idempotency-Key header so a retried/double-submitted request pays out once,
  // not twice.
  app.post('/me/instant', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const idempotencyKey = request.headers['idempotency-key'];
    if (!idempotencyKey) return sendError(reply, 'Idempotency-Key header is required', 400);
    const data = await payoutService.initiateInstantPayout(request.user.id, request.user.id, idempotencyKey);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/payouts/mine?status=&page=&limit=
  app.get('/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { driverId: request.user.id, status: request.query.status };
    const { rows, pagination } = await payoutService.listPayouts(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // ── Admin ─────────────────────────────────────────────────────────────────────

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
