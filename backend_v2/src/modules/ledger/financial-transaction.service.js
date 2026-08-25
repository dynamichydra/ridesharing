import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { financialTransactions } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function createFinancialTransaction({
  transactionType,
  referenceType,
  referenceId,
  currencyCode,
  amountMinor,
  status = 'pending',
  countryId = null,
  legalEntityId = null,
  metadata = null,
}) {
  const [txn] = await db.insert(financialTransactions).values({
    transactionType,
    referenceType,
    referenceId,
    currencyCode,
    amountMinor,
    status,
    countryId,
    legalEntityId,
    metadata,
  }).returning();
  return txn;
}

export async function updateFinancialTransactionStatus(id, status, metadata = null) {
  const patch = { status, updatedAt: new Date() };
  if (metadata) patch.metadata = metadata;
  const [updated] = await db.update(financialTransactions)
    .set(patch)
    .where(eq(financialTransactions.id, id))
    .returning();
  return updated;
}

export async function getFinancialTransaction(id) {
  const [txn] = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id)).limit(1);
  return txn || null;
}

export async function listFinancialTransactions(filters = {}, page = 1, limit = 20, offset = 0) {
  const conditions = [];
  if (filters.transactionType) conditions.push(eq(financialTransactions.transactionType, filters.transactionType));
  if (filters.referenceType)   conditions.push(eq(financialTransactions.referenceType, filters.referenceType));
  if (filters.referenceId)     conditions.push(eq(financialTransactions.referenceId, filters.referenceId));
  if (filters.status)          conditions.push(eq(financialTransactions.status, filters.status));
  if (filters.currencyCode)    conditions.push(eq(financialTransactions.currencyCode, filters.currencyCode));

  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(financialTransactions).where(where);
  const rows = await db.select().from(financialTransactions).where(where)
    .orderBy(desc(financialTransactions.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}
