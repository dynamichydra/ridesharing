import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin, authenticateAny } from '../../middleware/authenticate.js';
import { uploadBuffer, createUploadUrl, keyToPublicUrl } from '../../utils/storage.js';
import * as vehicleService from './vehicle.service.js';

const REQUIRED_FIELDS = ['vehicleModelId', 'year', 'registrationNumber'];

export async function vehicleRoutes(app) {

  // ── Unified Vehicle Photo Upload Endpoint (Driver & Admin) ─────────────────
  // Supports multipart/form-data direct file upload OR JSON { contentType } for presigned URL
  app.post('/upload-image', { preHandler: [authenticateAny] }, async (request, reply) => {
    try {
      if (request.isMultipart()) {
        const file = await request.file();
        if (!file) return sendError(reply, 'No image file uploaded in multipart request');
        const buffer = await file.toBuffer();
        const mime = file.mimetype || 'image/jpeg';
        const result = await uploadBuffer('vehicles', mime, buffer);
        return sendSuccess(reply, {
          url: result.url,
          key: result.key,
        }, 201);
      }

      // JSON upload-url request
      const { contentType = 'image/jpeg' } = request.body || {};
      const result = await createUploadUrl('vehicles', contentType);
      return sendSuccess(reply, {
        uploadUrl: result.uploadUrl,
        key: result.key,
        url: keyToPublicUrl(result.key),
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      return sendError(reply, err.message || 'Image upload failed', err.statusCode || 500);
    }
  });

  // Alias upload endpoint
  app.post('/upload-url', { preHandler: [authenticateAny] }, async (request, reply) => {
    try {
      const { contentType = 'image/jpeg' } = request.body || {};
      const result = await createUploadUrl('vehicles', contentType);
      return sendSuccess(reply, {
        uploadUrl: result.uploadUrl,
        key: result.key,
        url: keyToPublicUrl(result.key),
        expiresIn: result.expiresIn,
      });
    } catch (err) {
      return sendError(reply, err.message || 'Failed to generate upload URL', err.statusCode || 500);
    }
  });

  // ── Unified Vehicle List (Driver & Admin) ──────────────────────────────────
  app.get('/', { preHandler: [authenticateAny] }, async (request, reply) => {
    const role = request.user.role;
    if (role === 'driver') {
      const data = await vehicleService.listMyVehicles(request.user.id);
      return sendSuccess(reply, data);
    }

    if (['admin', 'super_admin'].includes(role)) {
      const data = await vehicleService.listAllVehicles(request.query || {});
      return sendSuccess(reply, data);
    }

    return sendError(reply, 'Unauthorized access', 403);
  });

  // ── Driver-specific list ───────────────────────────────────────────────────
  app.get('/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await vehicleService.listMyVehicles(request.user.id);
    return sendSuccess(reply, data);
  });

  // ── Single Vehicle Details ─────────────────────────────────────────────────
  app.get('/:id', { preHandler: [authenticateAny] }, async (request, reply) => {
    const vehicle = await vehicleService.getVehicleById(request.params.id);
    if (!vehicle) return sendError(reply, 'Vehicle not found', 404);

    const role = request.user.role;
    if (role === 'driver' && vehicle.driverId !== request.user.id) {
      return sendError(reply, 'Access denied', 403);
    }

    return sendSuccess(reply, vehicle);
  });

  // ── Unified Add Vehicle Endpoint (Driver & Admin) ───────────────────────────
  app.post('/', { preHandler: [authenticateAny] }, async (request, reply) => {
    const missing = REQUIRED_FIELDS.filter((f) => !request.body[f]);
    if (missing.length) return sendError(reply, `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`);

    const role = request.user.role;

    // Admin adding vehicle for a specific driver
    if (['admin', 'super_admin'].includes(role)) {
      const driverId = request.body.driverId;
      if (!driverId) return sendError(reply, 'driverId is required when admin adds a vehicle');
      const data = await vehicleService.adminAddVehicle(driverId, request.user.id, request.body);
      return sendSuccess(reply, data, 201);
    }

    // Driver self-registration
    if (role === 'driver') {
      const data = await vehicleService.addVehicle(request.user.id, request.body);
      return sendSuccess(reply, data, 201);
    }

    return sendError(reply, 'Driver or Admin role required', 403);
  });

  // ── Unified Update Vehicle Endpoint (Driver & Admin) ────────────────────────
  app.patch('/:id', { preHandler: [authenticateAny] }, async (request, reply) => {
    const role = request.user.role;

    if (['admin', 'super_admin'].includes(role)) {
      let driverId = request.body.driverId;
      if (!driverId) {
        const existing = await vehicleService.getVehicleById(request.params.id);
        if (!existing) return sendError(reply, 'Vehicle not found', 404);
        driverId = existing.driverId;
      }
      const data = await vehicleService.adminUpdateVehicle(driverId, request.params.id, request.user.id, request.body);
      return sendSuccess(reply, data);
    }

    if (role === 'driver') {
      const data = await vehicleService.updateVehicle(request.user.id, request.params.id, request.body);
      return sendSuccess(reply, data);
    }

    return sendError(reply, 'Driver or Admin role required', 403);
  });

  // ── Delete Vehicle ─────────────────────────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticateAny] }, async (request, reply) => {
    const role = request.user.role;

    if (['admin', 'super_admin'].includes(role)) {
      const existing = await vehicleService.getVehicleById(request.params.id);
      if (!existing) return sendError(reply, 'Vehicle not found', 404);
      const data = await vehicleService.adminRemoveVehicle(existing.driverId, request.params.id, request.user.id);
      return sendSuccess(reply, data);
    }

    if (role === 'driver') {
      const data = await vehicleService.removeVehicle(request.user.id, request.params.id);
      return sendSuccess(reply, data);
    }

    return sendError(reply, 'Driver or Admin role required', 403);
  });

  // ── Activate Vehicle (Driver self-service) ──────────────────────────────────
  app.post('/:id/activate', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await vehicleService.activateVehicle(request.user.id, request.params.id);
    return sendSuccess(reply, data);
  });

  app.get('/:id/inspections', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await vehicleService.listVehicleInspections(request.params.id);
    return sendSuccess(reply, data);
  });

  // ── Admin-specific Routes (Backward Compatibility) ──────────────────────────
  app.get('/admin/drivers/:driverId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vehicleService.listDriverVehicles(request.params.driverId);
    return sendSuccess(reply, data);
  });

  app.post('/admin/drivers/:driverId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vehicleService.adminAddVehicle(request.params.driverId, request.user.id, request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/admin/drivers/:driverId/:vehicleId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vehicleService.adminUpdateVehicle(request.params.driverId, request.params.vehicleId, request.user.id, request.body);
    return sendSuccess(reply, data);
  });

  app.delete('/admin/drivers/:driverId/:vehicleId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vehicleService.adminRemoveVehicle(request.params.driverId, request.params.vehicleId, request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/admin/drivers/:driverId/:vehicleId/activate', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vehicleService.adminActivateVehicle(request.params.driverId, request.params.vehicleId, request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/admin/drivers/:driverId/:vehicleId/inspections', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vehicleService.recordInspection(request.params.driverId, request.params.vehicleId, request.user.id, request.body || {});
    return sendSuccess(reply, data, 201);
  });

  app.get('/admin/vehicles/:vehicleId/inspections', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await vehicleService.listVehicleInspections(request.params.vehicleId);
    return sendSuccess(reply, data);
  });
}
