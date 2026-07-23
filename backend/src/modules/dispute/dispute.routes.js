import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as disputeService from './dispute.service.js';

// Admin-only, read/triage only — see dispute.service.js for why accepting/contesting a
// dispute with the processor is out of scope here.
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
}
