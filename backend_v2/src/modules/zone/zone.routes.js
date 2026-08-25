import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as zoneService from './zone.service.js';
import { generateHexCells, resolveHexZones } from './hex-zone.service.js';

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

  // POST /resolve-hex — given lat/lng, returns all H3 hex-zone matches, priority-ordered (most specific first)
  app.post('/resolve-hex', async (request, reply) => {
    const { lat, lng } = request.body;
    if (!lat || !lng) return sendError(reply, 'lat and lng are required');
    const matches = await resolveHexZones(parseFloat(lat), parseFloat(lng));
    return sendSuccess(reply, matches);
  });

  // Admin only
  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, type, polygon, countryId, resolution } = request.body;
    if (!name || !type || !polygon || !countryId) {
      return sendError(reply, 'name, type, polygon and countryId are required');
    }
    let data = await zoneService.create(request.body);
    if (resolution) data = await generateHexCells(data.id, resolution);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    let data = await zoneService.update(request.params.id, request.body);
    if (request.body.polygon || request.body.resolution) {
      data = await generateHexCells(data.id, request.body.resolution ?? data.resolution);
    }
    return sendSuccess(reply, data);
  });

  // POST /:id/generate-hex-cells — (re)derive hexCells from the stored polygon, e.g. after
  // changing resolution
  app.post('/:id/generate-hex-cells', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await generateHexCells(request.params.id, request.body?.resolution);
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
