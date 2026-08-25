import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as vtService from './vehicle-type.service.js';

export async function vehicleTypeRoutes(app) {

  // Public — riders/drivers can see vehicle types
  app.get('/', async (request, reply) => {
    const isAdmin = request.query.all === 'true';
    if (isAdmin) {
      const { page, limit, offset } = parsePagination(request.query);
      const { rows, pagination } = await vtService.listPaginated(page, limit, offset);
      return sendList(reply, rows, pagination);
    }
    const data = await vtService.listAll(true);
    return sendSuccess(reply, data);
  });

  app.get('/:id', async (request, reply) => {
    const data = await vtService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  // Admin only — catalog (physical attributes, same across every country)
  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name } = request.body;
    if (!name) return sendError(reply, 'name is required');
    const data = await vtService.create(request.body, request.user.id);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vtService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vtService.setActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vtService.setActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });
}
