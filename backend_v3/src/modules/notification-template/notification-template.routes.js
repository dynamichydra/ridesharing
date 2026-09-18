import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as templateService from './notification-template.service.js';

export async function notificationTemplateRoutes(app) {

  // GET /api/v1/notification-templates/events — the static event registry (eventType, its
  // {{variables}}, default channels) that the portal's variable-picker reads from.
  app.get('/events', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    return sendSuccess(reply, templateService.listEvents());
  });

  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      eventType: request.query.eventType,
      channel: request.query.channel,
      isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined,
    };
    const { rows, pagination } = await templateService.listTemplates(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await templateService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { eventType, channel, bodyHtml } = request.body;
    if (!eventType || !channel || !bodyHtml) {
      return sendError(reply, 'eventType, channel and bodyHtml are required');
    }
    const data = await templateService.create(request.user.id, request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await templateService.update(request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/enable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await templateService.setActive(request.params.id, true, request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/:id/disable', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await templateService.setActive(request.params.id, false, request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/:id/preview', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await templateService.previewTemplate(request.params.id, request.body?.variables || {});
    return sendSuccess(reply, data);
  });
}
