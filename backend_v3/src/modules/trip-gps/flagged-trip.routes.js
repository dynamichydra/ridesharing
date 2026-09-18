import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as flaggedTripService from './flagged-trip.service.js';

/**
 * Admin review queue for trips whose GPS-derived actual fare deviated from the
 * upfront estimate by more than the configured tolerance (see
 * deviation-policy.js) — these are never auto-billed past the estimate.
 * Backend only this pass; portal UI is a suggested follow-up.
 */
export async function flaggedTripRoutes(app) {

  // GET /api/v1/flagged-trips?status=pending_review
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const { rows, pagination } = await flaggedTripService.list(page, limit, offset, {
      status: request.query.status,
    });
    return sendList(reply, rows, pagination);
  });

  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await flaggedTripService.getById(request.params.id);
    return sendSuccess(reply, data);
  });

  // Bills the recomputed actual fare — admin has reviewed the deviation and
  // confirmed it's legitimate (e.g. a genuine detour or long wait).
  app.patch('/:id/approve', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await flaggedTripService.approve(request.params.id, request.user.id, request.body?.note);
    return sendSuccess(reply, data);
  });

  // Bills a manually-set amount instead (e.g. splitting the difference, or a
  // goodwill adjustment) rather than either the estimate or the raw GPS-derived actual.
  app.patch('/:id/adjust', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { adjustedFareMinor, note } = request.body || {};
    if (adjustedFareMinor == null) return sendError(reply, 'adjustedFareMinor is required');
    const data = await flaggedTripService.adjust(request.params.id, adjustedFareMinor, request.user.id, note);
    return sendSuccess(reply, data);
  });
}
