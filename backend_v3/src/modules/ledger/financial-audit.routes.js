import { sendSuccess, sendList } from '../../utils/response.js';
import { runFullFinancialAudit } from './financial-audit.service.js';
import { listFinancialTransactions } from './financial-transaction.service.js';

export async function financialAuditRoutes(fastify) {
  fastify.get('/audit/health', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const report = await runFullFinancialAudit();
    return sendSuccess(reply, report);
  });

  fastify.get('/financial-transactions', { preHandler: [fastify.authenticate] }, async (req, reply) => {
    const { page = 1, limit = 20, transactionType, referenceType, referenceId, status, currencyCode } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;
    const result = await listFinancialTransactions(
      { transactionType, referenceType, referenceId, status, currencyCode },
      pageNum, limitNum, offset,
    );
    return sendList(reply, result.rows, result.pagination);
  });
}
