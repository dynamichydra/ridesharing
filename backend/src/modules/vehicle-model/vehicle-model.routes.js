import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as vmService from './vehicle-model.service.js';

export async function vehicleModelRoutes(app) {

  // Public — riders/drivers pick a model when registering a vehicle
  app.get('/', async (request, reply) => {
    const { vehicleTypeId } = request.query;
    const isAdmin = request.query.all === 'true';
    if (isAdmin) {
      const { page, limit, offset } = parsePagination(request.query);
      const { rows, pagination } = await vmService.listPaginated(page, limit, offset, vehicleTypeId);
      return sendList(reply, rows, pagination);
    }
    const data = await vmService.listAll(true, vehicleTypeId);
    return sendSuccess(reply, data);
  });

  app.get('/:id', async (request, reply) => {
    const data = await vmService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  // Admin only — master data (no delete: models stay as history for vehicles already using them)
  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { vehicleTypeId, brand, name } = request.body;
    if (!vehicleTypeId || !brand || !name) return sendError(reply, 'vehicleTypeId, brand, name are required');
    const data = await vmService.create(request.body, request.user.id);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vmService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vmService.setActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vmService.setActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });
}
