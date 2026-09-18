import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as ledgerService from './ledger.service.js';

export async function ledgerRoutes(app) {

  // GET /api/v1/ledger/transactions?businessType=&referenceType=&referenceId=&page=&limit=
  app.get('/transactions', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      businessType:  request.query.businessType,
      referenceType: request.query.referenceType,
      referenceId:   request.query.referenceId,
    };
    const { rows, pagination } = await ledgerService.listTransactions(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/ledger/transactions/:id — transaction + its balanced entries
  app.get('/transactions/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await ledgerService.getTransaction(request.params.id);
    return sendSuccess(reply, data);
  });
}
