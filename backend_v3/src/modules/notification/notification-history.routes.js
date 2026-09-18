import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateRider, authenticateAdmin } from '../../middleware/authenticate.js';
import * as historyService from './notification-history.service.js';

// GET .../notifications?page=&limit= — shared body for the driver/rider self-service mounts.
async function listMine(request, reply, userType) {
  const { page, limit, offset } = parsePagination(request.query);
  const { rows, pagination } = await historyService.listForUser(request.user.id, userType, page, limit, offset);
  return sendList(reply, rows, pagination);
}

export async function driverNotificationRoutes(app) {
  app.get('/', { preHandler: [authenticateDriver] }, (request, reply) => listMine(request, reply, 'driver'));

  // GET /driver/notifications/unread-count — separate from the list envelope's COUNT (that's
  // "items on this page"), this is the total unread count for a notification-bell badge.
  app.get('/unread-count', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const unreadCount = await historyService.getUnreadCount(request.user.id, 'driver');
    return sendSuccess(reply, { unreadCount });
  });

  app.patch('/:id/read', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await historyService.markRead(request.params.id, request.user.id, 'driver');
    return sendSuccess(reply, data);
  });
}

export async function riderNotificationRoutes(app) {
  app.get('/', { preHandler: [authenticateRider] }, (request, reply) => listMine(request, reply, 'rider'));

  app.get('/unread-count', { preHandler: [authenticateRider] }, async (request, reply) => {
    const unreadCount = await historyService.getUnreadCount(request.user.id, 'rider');
    return sendSuccess(reply, { unreadCount });
  });

  app.patch('/:id/read', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await historyService.markRead(request.params.id, request.user.id, 'rider');
    return sendSuccess(reply, data);
  });
}

// Mounted at ${PREFIX}/admin — GET /admin/notifications?userId=&userType=
export async function adminNotificationRoutes(app) {
  app.get('/notifications', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { userId: request.query.userId, userType: request.query.userType };
    const { rows, pagination } = await historyService.listForAdmin(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });
}
