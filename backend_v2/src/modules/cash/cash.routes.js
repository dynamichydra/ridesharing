import { reportCashCollection, openCashDispute } from './cash.service.js';

export async function cashRoutes(fastify) {
  fastify.post('/collections/report', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const result = await reportCashCollection({
      ...req.body,
      driverId: req.user.id || req.body.driverId,
    });
    return reply.status(201).send({ SUCCESS: true, DATA: result });
  });

  fastify.post('/disputes/open', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const dispute = await openCashDispute(req.body);
    return reply.status(201).send({ SUCCESS: true, DATA: dispute });
  });
}
