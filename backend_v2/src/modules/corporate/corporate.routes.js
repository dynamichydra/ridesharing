import {
  createCorporateAccount, addCorporateUser, generateCorporateInvoice,
  payCorporateInvoice, checkCorporateCreditAvailable, listCorporateAccounts,
  listCorporateInvoices, getCorporateInvoice,
} from './corporate.service.js';
import { parsePagination, sendList, sendSuccess } from '../../utils/response.js';

export async function corporateRoutes(fastify) {
  fastify.get('/accounts', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { page, limit, offset } = parsePagination(req.query);
    const filters = { status: req.query.status };
    const { rows, pagination } = await listCorporateAccounts(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  fastify.post('/accounts', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const account = await createCorporateAccount(req.body);
    return sendSuccess(reply, account, 201);
  });

  fastify.post('/accounts/:id/users', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const user = await addCorporateUser(req.params.id, req.body);
    return sendSuccess(reply, user, 201);
  });

  fastify.get('/accounts/:id/credit-check', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { amountMinor } = req.query;
    const result = await checkCorporateCreditAvailable(req.params.id, parseInt(amountMinor || '0', 10));
    return sendSuccess(reply, result);
  });

  fastify.get('/invoices', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, pagination } = await listCorporateInvoices(req.query.corporateAccountId, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  fastify.post('/accounts/:id/invoices', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { periodStart, periodEnd } = req.body;
    const invoice = await generateCorporateInvoice(req.params.id, periodStart, periodEnd);
    return sendSuccess(reply, invoice, 201);
  });

  fastify.get('/invoices/:id', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const invoice = await getCorporateInvoice(req.params.id);
    return sendSuccess(reply, invoice);
  });

  fastify.post('/invoices/:id/pay', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const result = await payCorporateInvoice(req.params.id, req.body);
    return sendSuccess(reply, result);
  });
}

