import { reportCashCollection, openCashDispute, listCashCollections, listCashDisputes, verifyCashCollection } from './cash.service.js';
import { parsePagination, sendList, sendSuccess } from '../../utils/response.js';

export async function cashRoutes(fastify) {
  fastify.get('/collections', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { page, limit, offset } = parsePagination(req.query);
    const filters = {
      status: req.query.status,
      driverId: req.query.driverId,
      currencyCode: req.query.currencyCode,
    };
    const { rows, pagination } = await listCashCollections(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  fastify.post('/collections/report', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const result = await reportCashCollection({
      ...req.body,
      driverId: req.body.driverId || req.user.id,
    });
    return sendSuccess(reply, result, 201);
  });

  fastify.put('/collections/:id/verify', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const result = await verifyCashCollection(req.params.id);
    return sendSuccess(reply, result);
  });

  fastify.get('/disputes', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { page, limit, offset } = parsePagination(req.query);
    const filters = { status: req.query.status };
    const { rows, pagination } = await listCashDisputes(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  fastify.post('/disputes/open', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const dispute = await openCashDispute(req.body);
    return sendSuccess(reply, dispute, 201);
  });
}

