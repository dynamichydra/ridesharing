import { runFullFinancialAudit } from './financial-audit.service.js';
import { listFinancialTransactions } from './financial-transaction.service.js';

export async function financialAuditRoutes(fastify) {
  fastify.get('/audit/health', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const report = await runFullFinancialAudit();
    return reply.send({ SUCCESS: true, DATA: report });
  });

  fastify.get('/financial-transactions', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { page = 1, limit = 20, transactionType, referenceType, referenceId, status, currencyCode } = req.query;
    const offset = (page - 1) * limit;
    const result = await listFinancialTransactions(
      { transactionType, referenceType, referenceId, status, currencyCode },
      page, limit, offset,
    );
    return reply.send({ SUCCESS: true, ...result });
  });
}
