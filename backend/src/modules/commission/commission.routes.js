import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as commissionService from './commission.service.js';

export async function commissionRoutes(app) {

  // GET /api/v1/commission-rules?countryId=&isActive=&page=&limit=
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      countryId: request.query.countryId,
      isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined,
    };
    const { rows, pagination } = await commissionService.listRules(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await commissionService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, subscriberRate, nonSubscriberRate } = request.body;
    if (!name || subscriberRate == null || nonSubscriberRate == null) {
      return sendError(reply, 'name, subscriberRate and nonSubscriberRate are required');
    }
    const data = await commissionService.create(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await commissionService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await commissionService.setActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await commissionService.setActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });
}
