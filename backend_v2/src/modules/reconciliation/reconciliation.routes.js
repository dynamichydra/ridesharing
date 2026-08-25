import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as reconciliationService from './reconciliation.service.js';

export async function reconciliationRoutes(app) {

  // GET /api/v1/reconciliation/runs?gateway=&page=&limit=
  app.get('/runs', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { gateway: request.query.gateway };
    const { rows, pagination } = await reconciliationService.listRuns(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/reconciliation/mismatches?runId=&status=&severity=&page=&limit=
  app.get('/mismatches', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { runId: request.query.runId, status: request.query.status, severity: request.query.severity };
    const { rows, pagination } = await reconciliationService.listMismatches(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // PATCH /api/v1/reconciliation/mismatches/:id  { status: 'resolved'|'ignored', notes? }
  app.patch('/mismatches/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { status, notes } = request.body;
    const data = await reconciliationService.resolveMismatch(request.params.id, {
      status, notes, resolvedBy: request.user.id,
    });
    return sendSuccess(reply, data);
  });
}
