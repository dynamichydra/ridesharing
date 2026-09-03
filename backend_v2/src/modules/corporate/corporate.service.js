import { eq, and, desc, count, sql, inArray, gte, lte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  corporateAccounts, corporateUsers, corporateInvoices,
  corporateInvoiceItems, corporatePayments, users, rides,
} from '../../../drizzle/schema/index.js';
import { postTransaction, getOrCreateSystemAccount } from '../ledger/ledger.service.js';
import { createFinancialTransaction } from '../ledger/financial-transaction.service.js';
import { paginate } from '../../utils/response.js';
import { moment } from '../../utils/time.js';

export async function createCorporateAccount(data) {
  const [account] = await db.insert(corporateAccounts).values(data).returning();
  return account;
}

export async function addCorporateUser(corporateAccountId, { userId, role = 'employee', spendingLimitMinor = null }) {
  const [corpUser] = await db.insert(corporateUsers).values({
    corporateAccountId,
    userId,
    role,
    spendingLimitMinor,
  }).returning();
  return corpUser;
}

export async function checkCorporateCreditAvailable(corporateAccountId, amountMinor) {
  const [account] = await db.select().from(corporateAccounts).where(eq(corporateAccounts.id, corporateAccountId)).limit(1);
  if (!account) throw { statusCode: 404, message: 'Corporate account not found' };

  const available = account.creditLimitMinor - account.currentExposureMinor;
  return {
    isAvailable: available >= amountMinor,
    creditLimitMinor: account.creditLimitMinor,
    currentExposureMinor: account.currentExposureMinor,
    availableMinor: Math.max(0, available),
  };
}

/**
 * Charge ride to corporate account: increases current exposure.
 */
export async function chargeRideToCorporate(corporateAccountId, rideId, estimatedFareMinor) {
  return db.transaction(async (tx) => {
    const [account] = await tx.select().from(corporateAccounts)
      .where(eq(corporateAccounts.id, corporateAccountId))
      .for('update')
      .limit(1);

    if (!account) throw { statusCode: 404, message: 'Corporate account not found' };

    const available = account.creditLimitMinor - account.currentExposureMinor;
    if (available < estimatedFareMinor) {
      throw { statusCode: 422, message: 'Corporate credit limit exceeded' };
    }

    const [updated] = await tx.update(corporateAccounts).set({
      currentExposureMinor: account.currentExposureMinor + estimatedFareMinor,
      updatedAt: new Date(),
    }).where(eq(corporateAccounts.id, corporateAccountId)).returning();

    return updated;
  });
}

/**
 * Generate monthly/periodic corporate invoice for all uninvoiced corporate rides.
 */
export async function generateCorporateInvoice(corporateAccountId, periodStart, periodEnd) {
  const [account] = await db.select().from(corporateAccounts).where(eq(corporateAccounts.id, corporateAccountId)).limit(1);
  if (!account) throw { statusCode: 404, message: 'Corporate account not found' };

  const invoiceNumber = `INV-CORP-${Date.now()}`;
  const dueDate = moment().add(30, 'days').toDate(); // Net 30 default

  // Find all employees belonging to this corporate account
  const corpUsers = await db.select({ userId: corporateUsers.userId })
    .from(corporateUsers)
    .where(eq(corporateUsers.corporateAccountId, corporateAccountId));
  const userIds = corpUsers.map((u) => u.userId).filter(Boolean);

  let eligibleRides = [];
  if (userIds.length > 0) {
    eligibleRides = await db.select().from(rides).where(and(
      inArray(rides.riderId, userIds),
      eq(rides.status, 'completed'),
      gte(rides.completedAt, moment(periodStart).toDate()),
      lte(rides.completedAt, moment(periodEnd).toDate())
    ));
  }

  let itemsSubtotalMinor = 0;
  for (const r of eligibleRides) {
    itemsSubtotalMinor += (r.finalFareMinor || r.estimatedFareMinor || 0);
  }

  const invoiceSubtotal = itemsSubtotalMinor > 0 ? itemsSubtotalMinor : account.currentExposureMinor;

  const [invoice] = await db.insert(corporateInvoices).values({
    corporateAccountId,
    invoiceNumber,
    periodStart: moment(periodStart).toDate(),
    periodEnd: moment(periodEnd).toDate(),
    subtotalMinor: invoiceSubtotal,
    totalMinor: invoiceSubtotal,
    currencyCode: account.currencyCode,
    status: 'issued',
    dueAt: dueDate,
  }).returning();

  // Populate itemized line items
  if (eligibleRides.length > 0) {
    const lineItems = eligibleRides.map((r) => {
      const fare = r.finalFareMinor || r.estimatedFareMinor || 0;
      return {
        invoiceId: invoice.id,
        rideId: r.id,
        employeeId: r.riderId,
        amountMinor: fare,
        taxMinor: 0,
        totalMinor: fare,
        currencyCode: r.currencyCode || account.currencyCode,
      };
    });
    await db.insert(corporateInvoiceItems).values(lineItems);
  }

  return invoice;
}

export async function getCorporateInvoice(invoiceId) {
  const [invoice] = await db.select().from(corporateInvoices).where(eq(corporateInvoices.id, invoiceId)).limit(1);
  if (!invoice) throw { statusCode: 404, message: 'Corporate invoice not found' };

  const items = await db.select().from(corporateInvoiceItems).where(eq(corporateInvoiceItems.invoiceId, invoiceId));
  return { ...invoice, items };
}

/**
 * Record corporate invoice settlement payment:
 * DR PSP_CLEARING / BANK_CLEARING
 *   CR CORPORATE_RECEIVABLE
 */
export async function payCorporateInvoice(invoiceId, { amountMinor, paymentMethod, gatewayPaymentId }) {
  const [invoice] = await db.select().from(corporateInvoices).where(eq(corporateInvoices.id, invoiceId)).limit(1);
  if (!invoice) throw { statusCode: 404, message: 'Invoice not found' };

  const curr = invoice.currencyCode;
  const clearingAccount = await getOrCreateSystemAccount('processor_clearing:bank_transfer', curr, {
    accountCategory: 'CLEARING',
    subType: 'BANK_CLEARING',
  });
  const receivableAccount = await getOrCreateSystemAccount('receivable:corporate', curr, {
    accountCategory: 'ASSET',
    subType: 'CORPORATE_RECEIVABLE',
  });

  const entries = [
    {
      accountId: clearingAccount.id,
      direction: 'debit',
      amountMinor,
      currencyCode: curr,
    },
    {
      accountId: receivableAccount.id,
      direction: 'credit',
      amountMinor,
      currencyCode: curr,
    },
  ];

  const ledgerResult = await postTransaction({
    businessType: 'corporate_invoice_settlement',
    idempotencyKey: `corp_inv_pay_${invoiceId}_${amountMinor}`,
    entries,
    referenceType: 'corporate_invoice',
    referenceId: invoiceId,
    metadata: { invoiceId, paymentMethod, gatewayPaymentId },
  });

  await createFinancialTransaction({
    transactionType: 'CORPORATE_INVOICE',
    referenceType: 'corporate_invoice',
    referenceId: invoiceId,
    currencyCode: curr,
    amountMinor,
    status: 'settled',
  });

  const [payment] = await db.insert(corporatePayments).values({
    corporateAccountId: invoice.corporateAccountId,
    invoiceId,
    amountMinor,
    currencyCode: curr,
    paymentMethod,
    gatewayPaymentId,
    status: 'completed',
  }).returning();

  await db.update(corporateInvoices).set({
    paidAmountMinor: invoice.paidAmountMinor + amountMinor,
    status: (invoice.paidAmountMinor + amountMinor >= invoice.totalMinor) ? 'paid' : 'partially_paid',
    paidAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(corporateInvoices.id, invoiceId));

  return { payment, ledgerResult };
}

export async function listCorporateAccounts(page = 1, limit = 10, offset = 0, filters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(corporateAccounts.status, filters.status));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRes] = await db.select({ count: count() }).from(corporateAccounts).where(whereClause);
  const total = Number(totalRes?.count || 0);

  const rows = await db.select().from(corporateAccounts)
    .where(whereClause)
    .orderBy(desc(corporateAccounts.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(total, page, limit) };
}

export async function listCorporateInvoices(corporateAccountId = null, page = 1, limit = 10, offset = 0) {
  const conditions = [];
  if (corporateAccountId) conditions.push(eq(corporateInvoices.corporateAccountId, corporateAccountId));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRes] = await db.select({ count: count() }).from(corporateInvoices).where(whereClause);
  const total = Number(totalRes?.count || 0);

  const rows = await db.select().from(corporateInvoices)
    .where(whereClause)
    .orderBy(desc(corporateInvoices.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(total, page, limit) };
}

