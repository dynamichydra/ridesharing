import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateAdmin } from '../../middleware/authenticate.js';
import * as riderService from './rider.service.js';

export async function riderRoutes(app) {

  // ── Rider self ──────────────────────────────────────────────────────────────

  app.get('/me', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await riderService.getRiderMe(request.user.id);
    return sendSuccess(reply, data);
  });

  app.get('/profile', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await riderService.getProfile(request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/profile', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await riderService.updateProfile(request.user.id, request.body);
    return sendSuccess(reply, data);
  });

  app.get('/rides', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await riderService.getRideHistory(request.user.id, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.patch('/fcm-token', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { fcmToken } = request.body;
    if (!fcmToken) return sendError(reply, 'fcmToken is required');
    const data = await riderService.updateFcmToken(request.user.id, fcmToken);
    return sendSuccess(reply, data);
  });

  // ── Rider Preferences ───────────────────────────────────────────────────────
  app.get('/preferences', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { getRiderPreferences } = await import('./rider-preferences.service.js');
    const data = await getRiderPreferences(request.user.id);
    return sendSuccess(reply, data);
  });

  app.put('/preferences', { preHandler: [authenticateRider] }, async (request, reply) => {
    const { updateRiderPreferences } = await import('./rider-preferences.service.js');
    const data = await updateRiderPreferences(request.user.id, request.body || {});
    return sendSuccess(reply, data);
  });

  // ── Admin ──────────────────────────────────────────────────────────────────

  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      isVerified: request.query.isVerified !== undefined ? request.query.isVerified === 'true' : undefined,
      isBlocked: request.query.isBlocked !== undefined ? request.query.isBlocked === 'true' : undefined,
      countryId: request.query.countryId,
      stateId: request.query.stateId,
      cityId: request.query.cityId,
      search: request.query.search,
    };
    const { rows, pagination } = await riderService.listRiders(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    if (!request.body.phone || !request.body.name) {
      return sendError(reply, 'Phone and name are required');
    }
    const data = await riderService.adminCreateRider(request.body);
    return sendSuccess(reply, data, 201);
  });

  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await riderService.getRiderDetail(request.params.id);
    return sendSuccess(reply, data);
  });

  app.get('/:id/rides', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await riderService.getRideHistory(request.params.id, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await riderService.adminUpdateRider(request.params.id, request.body);
    return sendSuccess(reply, data);
  });
}

