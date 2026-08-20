import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateDriver, authenticateAdmin } from '../../middleware/authenticate.js';
import * as vehicleService from './vehicle.service.js';

const REQUIRED_FIELDS = ['vehicleModelId', 'year', 'registrationNumber'];

export async function vehicleRoutes(app) {

  app.get('/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await vehicleService.listMyVehicles(request.user.id);
    return sendSuccess(reply, data);
  });

  app.post('/', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const missing = REQUIRED_FIELDS.filter((f) => !request.body[f]);
    if (missing.length) return sendError(reply, `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`);
    const data = await vehicleService.addVehicle(request.user.id, request.body);
    return sendSuccess(reply, data, 201);
  });

  app.patch('/:id', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await vehicleService.updateVehicle(request.user.id, request.params.id, request.body);
    return sendSuccess(reply, data);
  });

  app.delete('/:id', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await vehicleService.removeVehicle(request.user.id, request.params.id);
    return sendSuccess(reply, data);
  });

  // ── Admin ────────────────────────────────────────────────────────────────────

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
}
