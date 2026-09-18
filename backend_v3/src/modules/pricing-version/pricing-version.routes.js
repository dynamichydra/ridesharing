import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as pvService from './pricing-version.service.js';

export async function pricingVersionRoutes(app) {

  app.get('/', async (request, reply) => {
    const isAdmin = request.query.all === 'true';
    if (isAdmin) {
      const { page, limit, offset } = parsePagination(request.query);
      const { rows, pagination } = await pvService.listPaginated(page, limit, offset, request.query);
      return sendList(reply, rows, pagination);
    }
    const data = await pvService.listAll(true);
    return sendSuccess(reply, data);
  });

  app.get('/:id', async (request, reply) => {
    const data = await pvService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pvService.create(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pvService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pvService.setActive(request.params.id, true);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await pvService.setActive(request.params.id, false);
    return sendSuccess(reply, data);
  });
}
