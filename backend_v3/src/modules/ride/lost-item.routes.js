import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateAny, authenticateAdmin } from '../../middleware/authenticate.js';
import * as lostItemService from './lost-item.service.js';

export async function lostItemRoutes(app) {
  // POST /api/v1/lost-items/rides/:rideId — File a lost item report
  app.post('/rides/:rideId', { preHandler: [authenticateAny] }, async (request, reply) => {
    const { itemCategory, description, contactPhone, photoUrl } = request.body || {};
    const data = await lostItemService.reportLostItem({
      rideId: request.params.rideId,
      userId: request.user.id,
      userRole: request.user.role,
      itemCategory,
      description,
      contactPhone,
      photoUrl,
    });
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/lost-items/rides/:rideId — View reports for a specific ride
  app.get('/rides/:rideId', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await lostItemService.getRideLostItems(request.params.rideId, request.user.id, request.user.role);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/lost-items/mine — View all my reported or assigned lost items
  app.get('/mine', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await lostItemService.listMyLostItems(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/lost-items/admin — Admin list all lost items
  app.get('/admin', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page = 1, limit = 10, offset = 0, status, rideId } = request.query || {};
    const { rows, pagination } = await lostItemService.listAdminLostItems({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      status,
      rideId,
    });
    return sendSuccess(reply, rows, 200, pagination);
  });

  // PATCH /api/v1/lost-items/:id/status — Update status
  app.patch('/:id/status', { preHandler: [authenticateAny] }, async (request, reply) => {
    const { status, resolutionNotes } = request.body || {};
    if (!status) return sendError(reply, 'status is required');
    const data = await lostItemService.updateLostItemStatus(request.params.id, request.user.id, request.user.role, {
      status,
      resolutionNotes,
    });
    return sendSuccess(reply, data);
  });
}

