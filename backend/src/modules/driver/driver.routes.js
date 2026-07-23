import { sendSuccess, sendError, sendList, parsePagination } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as driverService from './driver.service.js';

export async function driverRoutes(app) {

  // ── Driver self ──────────────────────────────────────────────────────────────

  app.get('/profile', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await driverService.getProfile(request.user.id);
    return sendSuccess(reply, data);
  });

  app.patch('/profile', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await driverService.updateProfile(request.user.id, request.body);
    return sendSuccess(reply, data);
  });

  app.put('/driving-location', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { countryId, stateId, cityId } = request.body;
    if (!countryId || !stateId || !cityId) return sendError(reply, 'countryId, stateId and cityId are required');
    const data = await driverService.updateDrivingLocation(request.user.id, request.body);
    return sendSuccess(reply, data);
  });

  app.post('/profile-photo/upload-url', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { contentType } = request.body;
    if (!contentType) return sendError(reply, 'contentType is required');
    const data = await driverService.requestProfilePhotoUploadUrl(contentType);
    return sendSuccess(reply, data);
  });

  app.post('/profile-photo', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { key } = request.body;
    if (!key) return sendError(reply, 'key is required');
    const data = await driverService.confirmProfilePhoto(request.user.id, key);
    return sendSuccess(reply, data);
  });

  app.get('/registration-summary', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await driverService.getRegistrationSummary(request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/submit-application', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await driverService.submitApplication(request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/documents', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await driverService.submitDocuments(request.user.id, request.body);
    return sendSuccess(reply, data);
  });

  app.post('/go-online', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { lat, lng } = request.body;
    if (!lat || !lng) return sendError(reply, 'lat and lng are required');
    const data = await driverService.goOnline(request.user.id, lat, lng);
    return sendSuccess(reply, data);
  });

  app.post('/go-offline', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await driverService.goOffline(request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/location', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { lat, lng } = request.body;
    if (!lat || !lng) return sendError(reply, 'lat and lng are required');
    const data = await driverService.updateLocation(request.user.id, lat, lng);
    return sendSuccess(reply, data);
  });

  app.patch('/fcm-token', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const { fcmToken } = request.body;
    if (!fcmToken) return sendError(reply, 'fcmToken is required');
    const data = await driverService.updateFcmToken(request.user.id, fcmToken);
    return sendSuccess(reply, data);
  });

  // ── Admin ────────────────────────────────────────────────────────────────────

  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { name, phone, email } = request.body;
    if (!name) return sendError(reply, 'name is required');
    if (!phone && !email) return sendError(reply, 'phone or email is required');
    const data = await driverService.adminRegisterDriver(request.user.id, request.body);
    return sendSuccess(reply, data, 201);
  });

  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      approvalStatus:     request.query.approvalStatus,
      subscriptionStatus: request.query.subscriptionStatus,
      registrationStatus: request.query.registrationStatus,
      countryId:          request.query.countryId,
      stateId:            request.query.stateId,
      cityId:             request.query.cityId,
      isBlocked:          request.query.isBlocked !== undefined ? request.query.isBlocked === 'true' : undefined,
      search:             request.query.search,
    };
    const { rows, pagination } = await driverService.listDrivers(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await driverService.getDriverDetail(request.params.id);
    return sendSuccess(reply, data);
  });

  app.post('/:id/approve', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await driverService.approveDriver(request.params.id, request.user.id, request.body.note);
    return sendSuccess(reply, data);
  });

  app.post('/:id/reject', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { note } = request.body;
    if (!note) return sendError(reply, 'Rejection note is required');
    const data = await driverService.rejectDriver(request.params.id, request.user.id, note);
    return sendSuccess(reply, data);
  });

  app.post('/:id/request-documents', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { documentTypeCodes, note } = request.body;
    if (!Array.isArray(documentTypeCodes) || !documentTypeCodes.length) {
      return sendError(reply, 'documentTypeCodes[] is required');
    }
    const data = await driverService.requestMoreDocuments(request.params.id, request.user.id, documentTypeCodes, note);
    return sendSuccess(reply, data);
  });

  app.post('/:id/block', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await driverService.blockDriver(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/:id/unblock', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await driverService.unblockDriver(request.params.id, request.user.id);
    return sendSuccess(reply, data);
  });
}
