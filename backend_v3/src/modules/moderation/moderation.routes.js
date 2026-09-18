import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as moderationService from './moderation.service.js';

export async function moderationRoutes(app) {

  // GET /api/v1/admin/moderation/queue
  app.get('/queue', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      status: request.query.status,
      contentType: request.query.contentType,
      authorType: request.query.authorType,
    };
    const { rows, pagination } = await moderationService.listModerationQueue(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // PATCH /api/v1/admin/moderation/queue/:id
  app.patch('/queue/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { action, resolutionNotes } = request.body || {};
    if (!action) return sendError(reply, 'action is required (approve/redact/ban)', 400);

    const data = await moderationService.resolveModerationItem(request.params.id, request.user.id, { action, resolutionNotes });
    return sendSuccess(reply, data);
  });

  // POST /api/v1/admin/moderation/flag
  app.post('/flag', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { contentType, contentId, authorId, authorType, flagReason, flaggedText } = request.body || {};
    if (!contentType || !contentId || !authorId) {
      return sendError(reply, 'contentType, contentId, and authorId are required', 400);
    }

    const data = await moderationService.flagContentForReview({
      contentType,
      contentId,
      authorId,
      authorType,
      flagReason,
      flaggedText,
    });
    return sendSuccess(reply, data, 201);
  });
}
