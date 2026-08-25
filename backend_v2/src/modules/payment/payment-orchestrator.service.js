import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  paymentIntents, paymentSources, paymentAllocations, payments, wallets,
} from '../../../drizzle/schema/index.js';
import { selectGateway, getGateway } from './payment.service.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { createFinancialTransaction, updateFinancialTransactionStatus } from '../ledger/financial-transaction.service.js';
import { withIdempotency } from '../../utils/idempotency.js';

/**
 * Universal Payment Orchestrator supporting split-tender multi-source payments (Wallet + Promo + PSP + Corporate).
 */
export async function createPaymentIntentWithSources({
  payerId,
  payerType = 'rider',
  amountMinor,
  currencyCode,
  referenceType,
  referenceId,
  countryId = null,
  sources = [], // Array of { sourceType: 'wallet'|'promo'|'psp'|'corporate'|'cash', amountMinor, sourceId }
  idempotencyKey,
  metadata = {},
}) {
  return withIdempotency('payment_intent_create', idempotencyKey, payerId, async () => {
    // 1. Create the Payment Intent
    const [intent] = await db.insert(paymentIntents).values({
      payerId,
      payerType,
      amountMinor,
      currencyCode,
      status: 'processing',
      referenceType,
      referenceId,
      countryId,
      metadata,
    }).returning();

    // 2. Resolve allocations across sources
    let totalAllocated = 0;
    const resolvedSources = [];

    // If sources array is provided, allocate per requested breakdown; otherwise default 100% to PSP
    if (sources && sources.length > 0) {
      for (const s of sources) {
        resolvedSources.push({
          paymentIntentId: intent.id,
          sourceType: s.sourceType,
          sourceId: s.sourceId || null,
          amountMinor: s.amountMinor,
          currencyCode,
          priority: s.priority || 1,
          status: 'pending',
        });
        totalAllocated += s.amountMinor;
      }
    } else {
      resolvedSources.push({
        paymentIntentId: intent.id,
        sourceType: 'psp',
        sourceId: null,
        amountMinor,
        currencyCode,
        priority: 1,
        status: 'pending',
      });
      totalAllocated = amountMinor;
    }

    const insertedSources = await db.insert(paymentSources).values(resolvedSources).returning();

    // 3. If there is a PSP portion, select the best gateway and create the order
    const pspSource = insertedSources.find((s) => s.sourceType === 'psp' || s.sourceType === 'card' || s.sourceType === 'upi');
    let gatewayOrder = null;
    let gateway = null;

    if (pspSource && pspSource.amountMinor > 0) {
      gateway = await selectGateway({ countryId, currencyCode, amountMinor: pspSource.amountMinor });
      gatewayOrder = await gateway.createOrder({
        amountMinor: pspSource.amountMinor,
        currencyCode,
        metadata: { paymentIntentId: intent.id, referenceType, referenceId, payerId },
        idempotencyKey,
      });
    }

    return {
      paymentIntentId: intent.id,
      amountMinor,
      currencyCode,
      sources: insertedSources,
      gateway: gateway ? gateway.name : 'none',
      gatewayOrder,
    };
  });
}

/**
 * Capture and settle a split-tender payment intent into the double-entry ledger.
 */
export async function capturePaymentIntent({
  paymentIntentId,
  driverEarningsMinor = 0,
  platformRevenueMinor = 0,
  taxMinor = 0,
  driverWalletId = null,
  gatewayPaymentId = null,
  gatewaySignature = null,
  idempotencyKey,
}) {
  const [intent] = await db.select().from(paymentIntents).where(eq(paymentIntents.id, paymentIntentId)).limit(1);
  if (!intent) throw { statusCode: 404, message: 'Payment intent not found' };
  if (intent.status === 'succeeded') return { success: true, message: 'Already captured' };

  const sources = await db.select().from(paymentSources).where(eq(paymentSources.paymentIntentId, paymentIntentId));

  // 1. Create financial transaction record
  const finTxn = await createFinancialTransaction({
    transactionType: `${intent.referenceType.toUpperCase()}_PAYMENT`,
    referenceType: intent.referenceType,
    referenceId: intent.referenceId,
    currencyCode: intent.currencyCode,
    amountMinor: intent.amountMinor,
    status: 'settled',
    countryId: intent.countryId,
    metadata: { paymentIntentId, sources },
  });

  // 2. Build balanced ledger entries
  const entries = [];
  const curr = intent.currencyCode;

  // Debits: What sources provided money?
  for (const s of sources) {
    if (s.sourceType === 'wallet' && s.sourceId) {
      const walletAccount = await getOrCreateWalletAccount(s.sourceId, curr);
      entries.push({
        accountId: walletAccount.id,
        direction: 'debit',
        amountMinor: s.amountMinor,
        currencyCode: curr,
        reason: `${intent.referenceType}_payment_wallet_deduct`,
      });
    } else if (s.sourceType === 'promo') {
      const promoAccount = await getOrCreateSystemAccount('liability:promotions', curr, {
        accountCategory: 'LIABILITY',
        subType: 'PROMO_LIABILITY',
      });
      entries.push({
        accountId: promoAccount.id,
        direction: 'debit',
        amountMinor: s.amountMinor,
        currencyCode: curr,
      });
    } else if (s.sourceType === 'corporate') {
      const corpAccount = await getOrCreateSystemAccount('receivable:corporate', curr, {
        accountCategory: 'ASSET',
        subType: 'CORPORATE_RECEIVABLE',
      });
      entries.push({
        accountId: corpAccount.id,
        direction: 'debit',
        amountMinor: s.amountMinor,
        currencyCode: curr,
      });
    } else {
      // PSP / Card / UPI
      const pspAccount = await getOrCreateSystemAccount('processor_clearing:gateway', curr, {
        accountCategory: 'CLEARING',
        subType: 'PSP_CLEARING',
      });
      entries.push({
        accountId: pspAccount.id,
        direction: 'debit',
        amountMinor: s.amountMinor,
        currencyCode: curr,
      });
    }
  }

  // Credits: Who receives the economic value?
  // Driver payable
  if (driverEarningsMinor > 0 && driverWalletId) {
    const driverAccount = await getOrCreateWalletAccount(driverWalletId, curr);
    entries.push({
      accountId: driverAccount.id,
      direction: 'credit',
      amountMinor: driverEarningsMinor,
      currencyCode: curr,
      reason: `${intent.referenceType}_driver_fare_credit`,
    });
  }

  // Platform revenue
  if (platformRevenueMinor > 0) {
    const revenueAccount = await getOrCreateSystemAccount('revenue:platform_commission', curr, {
      accountCategory: 'REVENUE',
      subType: 'PLATFORM_REVENUE',
    });
    entries.push({
      accountId: revenueAccount.id,
      direction: 'credit',
      amountMinor: platformRevenueMinor,
      currencyCode: curr,
    });
  }

  // Tax payable
  if (taxMinor > 0) {
    const taxAccount = await getOrCreateSystemAccount('liability:tax_payable', curr, {
      accountCategory: 'LIABILITY',
      subType: 'TAX_PAYABLE',
    });
    entries.push({
      accountId: taxAccount.id,
      direction: 'credit',
      amountMinor: taxMinor,
      currencyCode: curr,
    });
  }

  // 3. Post atomic ledger transaction
  const ledgerResult = await postTransaction({
    businessType: `${intent.referenceType}_split_payment`,
    idempotencyKey: idempotencyKey || `capture_intent_${intent.id}`,
    entries,
    referenceType: intent.referenceType,
    referenceId: intent.referenceId,
    metadata: { paymentIntentId, gatewayPaymentId },
  });

  // 4. Update status to succeeded
  await db.update(paymentIntents).set({
    status: 'succeeded',
    updatedAt: new Date(),
  }).where(eq(paymentIntents.id, paymentIntentId));

  return { success: true, paymentIntentId, financialTransactionId: finTxn.id, ledgerResult };
}
