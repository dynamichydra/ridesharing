import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider } from '../../middleware/authenticate.js';
import * as riderService from './rider.service.js';

export async function riderRoutes(app) {

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
}
