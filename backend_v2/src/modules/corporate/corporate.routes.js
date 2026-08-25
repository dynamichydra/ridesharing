import {
  createCorporateAccount, addCorporateUser, generateCorporateInvoice,
  payCorporateInvoice, checkCorporateCreditAvailable,
} from './corporate.service.js';

export async function corporateRoutes(fastify) {
  fastify.post('/accounts', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const account = await createCorporateAccount(req.body);
    return reply.status(201).send({ SUCCESS: true, DATA: account });
  });

  fastify.post('/accounts/:id/users', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const user = await addCorporateUser(req.params.id, req.body);
    return reply.status(201).send({ SUCCESS: true, DATA: user });
  });

  fastify.get('/accounts/:id/credit-check', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { amountMinor } = req.query;
    const result = await checkCorporateCreditAvailable(req.params.id, parseInt(amountMinor || '0', 10));
    return reply.send({ SUCCESS: true, DATA: result });
  });

  fastify.post('/accounts/:id/invoices', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { periodStart, periodEnd } = req.body;
    const invoice = await generateCorporateInvoice(req.params.id, periodStart, periodEnd);
    return reply.status(201).send({ SUCCESS: true, DATA: invoice });
  });

  fastify.post('/invoices/:id/pay', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const result = await payCorporateInvoice(req.params.id, req.body);
    return reply.send({ SUCCESS: true, DATA: result });
  });
}
