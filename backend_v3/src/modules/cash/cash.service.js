import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { cashCollections, cashDisputes, rides, drivers } from '../../../drizzle/schema/index.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { createFinancialTransaction } from '../ledger/financial-transaction.service.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';

/**
 * Driver reports collected cash amount for a cash trip.
 */
export async function reportCashCollection({ rideId, driverId, expectedAmountMinor, collectedAmountMinor, platformCommissionMinor, currencyCode }) {
  const isMismatch = collectedAmountMinor !== expectedAmountMinor;
  const status = isMismatch ? 'mismatch' : 'reported';

  const [collection] = await db.insert(cashCollections).values({
    rideId,
    driverId,
    expectedAmountMinor,
    collectedAmountMinor,
    platformCommissionMinor,
    currencyCode,
    status,
  }).returning();

  // If matched or accepted, driver collected passenger's cash in person,
  // so driver owes platform commission.
  // Debit Driver Wallet (allowNegative=true if necessary), Credit Platform Revenue
  if (platformCommissionMinor > 0 && !isMismatch) {
    const driverWallet = await getOrCreateWallet(driverId, 'driver', currencyCode);
    const driverAccount = await getOrCreateWalletAccount(driverWallet.id, currencyCode, { ownerType: 'driver', ownerId: driverId });
    const revenueAccount = await getOrCreateSystemAccount('revenue:platform_commission', currencyCode, {
      accountCategory: 'REVENUE',
      subType: 'PLATFORM_REVENUE',
    });

    const entries = [
      {
        accountId: driverAccount.id,
        direction: 'debit',
        amountMinor: platformCommissionMinor,
        currencyCode,
        reason: 'cash_trip_platform_commission',
        allowNegative: true,
      },
      {
        accountId: revenueAccount.id,
        direction: 'credit',
        amountMinor: platformCommissionMinor,
        currencyCode,
      },
    ];

    await postTransaction({
      businessType: 'cash_ride_commission_deduct',
      idempotencyKey: `cash_comm_${rideId}_${driverId}`,
      entries,
      referenceType: 'ride',
      referenceId: rideId,
    });

    await createFinancialTransaction({
      transactionType: 'CASH_COLLECTION',
      referenceType: 'ride',
      referenceId: rideId,
      currencyCode,
      amountMinor: collectedAmountMinor,
      status: 'settled',
    });
  }

  return collection;
}

/**
 * Open a Cash Dispute when passenger or driver dispute the collected cash amount.
 */
export async function openCashDispute({ cashCollectionId, rideId, driverId, riderId, expectedAmountMinor, driverReportedMinor, riderReportedMinor, currencyCode }) {
  const [dispute] = await db.insert(cashDisputes).values({
    cashCollectionId,
    rideId,
    driverId,
    riderId,
    expectedAmountMinor,
    driverReportedMinor,
    riderReportedMinor,
    currencyCode,
    status: 'open',
  }).returning();

  await db.update(cashCollections).set({ status: 'disputed', updatedAt: new Date() }).where(eq(cashCollections.id, cashCollectionId));

  return dispute;
}

export async function listCashCollections(page = 1, limit = 10, offset = 0, filters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(cashCollections.status, filters.status));
  if (filters.driverId) conditions.push(eq(cashCollections.driverId, filters.driverId));
  if (filters.currencyCode) conditions.push(eq(cashCollections.currencyCode, filters.currencyCode));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRes] = await db.select({ count: count() }).from(cashCollections).where(whereClause);
  const total = Number(totalRes?.count || 0);

  const rows = await db
    .select({
      id: cashCollections.id,
      rideId: cashCollections.rideId,
      driverId: cashCollections.driverId,
      driverName: drivers.name,
      driverPhone: drivers.phone,
      expectedAmountMinor: cashCollections.expectedAmountMinor,
      collectedAmountMinor: cashCollections.collectedAmountMinor,
      platformCommissionMinor: cashCollections.platformCommissionMinor,
      currencyCode: cashCollections.currencyCode,
      status: cashCollections.status,
      disputeReason: cashCollections.disputeReason,
      reportedAt: cashCollections.reportedAt,
      verifiedAt: cashCollections.verifiedAt,
      createdAt: cashCollections.createdAt,
      updatedAt: cashCollections.updatedAt,
    })
    .from(cashCollections)
    .leftJoin(drivers, eq(cashCollections.driverId, drivers.id))
    .where(whereClause)
    .orderBy(desc(cashCollections.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: { currentPage: page, itemsPerPage: limit, totalItems: total, totalPages: Math.ceil(total / limit) || 1 } };
}

export async function verifyCashCollection(id) {
  const [updated] = await db.update(cashCollections)
    .set({ status: 'settled', verifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(cashCollections.id, id))
    .returning();
  return updated;
}

export async function listCashDisputes(page = 1, limit = 10, offset = 0, filters = {}) {
  const conditions = [];
  if (filters.status) conditions.push(eq(cashDisputes.status, filters.status));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRes] = await db.select({ count: count() }).from(cashDisputes).where(whereClause);
  const total = Number(totalRes?.count || 0);

  const rows = await db.select().from(cashDisputes)
    .where(whereClause)
    .orderBy(desc(cashDisputes.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: { currentPage: page, itemsPerPage: limit, totalItems: total, totalPages: Math.ceil(total / limit) || 1 } };
}

