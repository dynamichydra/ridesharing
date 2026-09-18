import { sendSuccess, sendList, sendError, parsePagination } from '../../utils/response.js';
import { authenticateAdmin, authenticateDriver } from '../../middleware/authenticate.js';
import * as groupService from './driver-group.service.js';

export async function driverGroupRoutes(app) {
  // ── Driver Routes ──────────────────────────────────────────────────────────

  // GET /api/v1/driver-groups/mine — Driver gets their own active groups
  app.get('/mine', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await groupService.getDriverGroups(request.user.id);
    return sendSuccess(reply, data);
  });

  // ── Admin Routes ───────────────────────────────────────────────────────────

  // GET /api/v1/driver-groups — List groups with pagination, search, and member counts
  app.get('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const isActive = request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined;
    const { rows, pagination } = await groupService.listGroups({
      page,
      limit,
      offset,
      countryId: request.query.countryId,
      isActive,
      search: request.query.search,
    });
    return sendList(reply, rows, pagination);
  });

  // POST /api/v1/driver-groups — Create new driver group
  app.post('/', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { countryId, name, code, description, isActive } = request.body || {};
    if (!name || !code) {
      return sendError(reply, 'name and code are required', 400);
    }
    const data = await groupService.createGroup({ countryId, name, code, description, isActive });
    return sendSuccess(reply, data, 201);
  });

  // GET /api/v1/driver-groups/:id — Get group details
  app.get('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await groupService.getGroupById(request.params.id);
    return sendSuccess(reply, data);
  });

  // PATCH /api/v1/driver-groups/:id — Update group
  app.patch('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await groupService.updateGroup(request.params.id, request.body || {});
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/driver-groups/:id — Delete group
  app.delete('/:id', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await groupService.deleteGroup(request.params.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/driver-groups/:id/members — List members in group
  app.get('/:id/members', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const data = await groupService.listGroupMembers(request.params.id, {
      page,
      limit,
      offset,
      search: request.query.search,
    });
    return sendList(reply, data.rows, data.pagination, { group: data.group });
  });

  // POST /api/v1/driver-groups/:id/members — Add drivers to group
  app.post('/:id/members', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const { driverIds, expiresAt } = request.body || {};
    if (!Array.isArray(driverIds) || driverIds.length === 0) {
      return sendError(reply, 'driverIds must be a non-empty array', 400);
    }
    const data = await groupService.addDriversToGroup(request.params.id, driverIds, expiresAt);
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/driver-groups/:id/members/:driverId — Remove a driver from group
  app.delete('/:id/members/:driverId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await groupService.removeDriverFromGroup(request.params.id, request.params.driverId);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/driver-groups/drivers/:driverId — Get groups a specific driver belongs to
  app.get('/drivers/:driverId', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await groupService.getDriverGroups(request.params.driverId);
    return sendSuccess(reply, data);
  });
}
