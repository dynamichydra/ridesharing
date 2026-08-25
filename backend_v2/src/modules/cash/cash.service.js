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
