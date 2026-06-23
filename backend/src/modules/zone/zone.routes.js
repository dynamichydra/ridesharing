import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as zoneService from './zone.service.js';

export async function zoneRoutes(app) {

  // Public — anyone can list active zones
  app.get('/', async (request, reply) => {
    if (request.query.page) {
      const { page, limit, offset } = parsePagination(request.query);
      const { rows, pagination } = await zoneService.listPaginated(page, limit, offset);
      return sendList(reply, rows, pagination);
    }
    const data = await zoneService.listAll();
    return sendSuccess(reply, data);
  });

  app.get('/:id', async (request, reply) => {
    const data = await zoneService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  // POST /detect — given lat/lng, returns which zone the point belongs to
  app.post('/detect', async (request, reply) => {
    const { lat, lng } = request.body;
    if (!lat || !lng) return sendError(reply, 'lat and lng are required');
    const zone = await zoneService.detectZone(parseFloat(lat), parseFloat(lng));
    return sendSuccess(reply, zone || null);
  });

  // Admin only
  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, type, polygon, multiplier, description } = request.body;
    if (!name || !type || !polygon) return sendError(reply, 'name, type and polygon are required');
    const data = await zoneService.create(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await zoneService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.delete('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await zoneService.remove(request.params.id);
    return sendSuccess(reply, data);
  });
}
