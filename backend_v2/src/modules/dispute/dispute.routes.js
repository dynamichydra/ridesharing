import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as disputeService from './dispute.service.js';

// Admin-only.
export async function disputeRoutes(app) {

  // GET /api/v1/disputes?status=&gateway=&page=&limit=
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { status: request.query.status, gateway: request.query.gateway };
    const { rows, pagination } = await disputeService.listDisputes(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/disputes/:id
  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await disputeService.getDispute(request.params.id);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/disputes/:id  { adminNotes }
  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await disputeService.updateDisputeNotes(request.params.id, request.body.adminNotes);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/disputes/:id/accept — concede the chargeback to the processor
  app.post('/:id/accept', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await disputeService.acceptDispute(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/disputes/:id/contest  { evidence }
  // `evidence` is passed through as-is to the gateway — Stripe's expected shape is documented
  // at stripe/cjs/resources/Disputes.d.ts (DisputeEvidence); Razorpay's contest evidence
  // format is unverified (see razorpay.gateway.js contestDispute).
  app.post('/:id/contest', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await disputeService.contestDispute(request.params.id, request.user.id, request.body.evidence);
    return sendSuccess(reply, data);
  });
}
