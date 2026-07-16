import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as zoneService from './zone.service.js';

export async function zoneRoutes(app) {

  // Public — anyone can list active zones, optionally scoped to a country
  app.get('/', async (request, reply) => {
    if (request.query.page) {
      const { page, limit, offset } = parsePagination(request.query);
      const { rows, pagination } = await zoneService.listPaginated(page, limit, offset, request.query.countryId);
      return sendList(reply, rows, pagination);
    }
    const data = await zoneService.listAll(request.query.countryId);
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
    const { name, type, polygon, countryId } = request.body;
    if (!name || !type || !polygon || !countryId) {
      return sendError(reply, 'name, type, polygon and countryId are required');
    }
    const data = await zoneService.create(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await zoneService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await zoneService.setActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await zoneService.setActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });
}
