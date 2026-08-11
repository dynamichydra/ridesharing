import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateRider, authenticateAdmin, authenticateAny } from '../../middleware/authenticate.js';
import * as emergencyService from './emergency.service.js';

export async function emergencyRoutes(app) {

  // ── Trusted Contacts (Rider) ────────────────────────────────────────────────
  // POST /api/v1/trusted-contacts
  app.post('/trusted-contacts', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await emergencyService.addTrustedContact(request.user.id, request.body || {});
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/trusted-contacts
  app.get('/trusted-contacts', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await emergencyService.listTrustedContacts(request.user.id);
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/trusted-contacts/:id
  app.delete('/trusted-contacts/:id', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await emergencyService.deleteTrustedContact(request.user.id, request.params.id);
    return sendSuccess(reply, data);
  });

  // ── Emergency SOS Alert (Rider / Driver) ────────────────────────────────────
  // POST /api/v1/rides/:rideId/sos
  app.post('/rides/:rideId/sos', { preHandler: [authenticateAny] }, async (request, reply) => {
    const data = await emergencyService.triggerSosAlert(request.params.rideId, request.user, request.body || {});
    return sendSuccess(reply, data, 201);
  });

  // ── Live Trip Sharing ────────────────────────────────────────────────────────
  // POST /api/v1/rides/:rideId/share-token
  app.post('/rides/:rideId/share-token', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await emergencyService.generateShareToken(request.params.rideId, request.user.id);
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/tracking/public/:token  (Unauthenticated public live tracking)
  app.get('/tracking/public/:token', async (request, reply) => {
    const data = await emergencyService.getPublicTripTracking(request.params.token);
    return sendSuccess(reply, data);
  });

  // ── Admin Safety Ops ─────────────────────────────────────────────────────────
  // GET /api/v1/admin/sos-alerts
  app.get('/admin/sos-alerts', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { status: request.query.status, userType: request.query.userType };
    const { rows, pagination } = await emergencyService.listSosAlerts(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // PATCH /api/v1/admin/sos-alerts/:id/resolve
  app.patch('/admin/sos-alerts/:id/resolve', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { resolutionNotes } = request.body || {};
    const data = await emergencyService.resolveSosAlert(request.params.id, request.user.id, resolutionNotes);
    return sendSuccess(reply, data);
  });
}
