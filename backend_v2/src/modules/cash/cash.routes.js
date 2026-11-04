import { reportCashCollection, openCashDispute, listCashCollections, listCashDisputes, verifyCashCollection } from './cash.service.js';
import { parsePagination, sendList, sendSuccess, sendError } from '../../utils/response.js';
import { authenticateAdmin, authenticateSuperAdmin, authenticateAny } from '../../middleware/authenticate.js';

const isAdmin = (user) => ['admin', 'super_admin'].includes(user?.role);

export async function cashRoutes(fastify) {
  fastify.get('/collections', { preHandler: [authenticateAdmin] }, async (req, reply) => {
    const { page, limit, offset } = parsePagination(req.query);
    const filters = {
      status: req.query.status,
      driverId: req.query.driverId,
      currencyCode: req.query.currencyCode,
    };
    const { rows, pagination } = await listCashCollections(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  // Drivers report their own collections; admins may report on a driver's behalf.
  fastify.post('/collections/report', { preHandler: [authenticateAny] }, async (req, reply) => {
    const { role, id } = req.user;
    if (role !== 'driver' && !isAdmin(req.user)) return sendError(reply, 'Driver or admin access only', 403);
    const result = await reportCashCollection({
      ...req.body,
      driverId: role === 'driver' ? id : (req.body.driverId || null),
    });
    return sendSuccess(reply, result, 201);
  });

  fastify.put('/collections/:id/verify', { preHandler: [authenticateSuperAdmin] }, async (req, reply) => {
    const result = await verifyCashCollection(req.params.id);
    return sendSuccess(reply, result);
  });

  fastify.get('/disputes', { preHandler: [authenticateAdmin] }, async (req, reply) => {
    const { page, limit, offset } = parsePagination(req.query);
    const filters = { status: req.query.status };
    const { rows, pagination } = await listCashDisputes(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  fastify.post('/disputes/open', { preHandler: [authenticateAdmin] }, async (req, reply) => {
    const dispute = await openCashDispute(req.body);
    return sendSuccess(reply, dispute, 201);
  });
}
