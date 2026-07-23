import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { wallets, driverPayoutAccounts, payoutBatches, payouts } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { formatMoney } from '../../utils/money.js';
import { withIdempotency } from '../../utils/idempotency.js';
import { getGateway } from '../payment/payment.service.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { getWallet } from '../wallet/wallet.service.js';

/**
 * Pure eligibility check — extracted so it's unit-testable without a DB or gateway call.
 * `gatewaySupportsPayouts` is passed in explicitly (from gateway.supportsPayouts) rather than
 * resolved inside this function, keeping it a pure function of its three inputs.
 */
export function selectEligiblePayout(wallet, payoutAccount, gatewaySupportsPayouts) {
  if (!wallet || !Number.isInteger(wallet.balanceMinor) || wallet.balanceMinor <= 0) {
    return { eligible: false, reason: 'No positive wallet balance to pay out' };
  }
  if (!payoutAccount || payoutAccount.status !== 'approved') {
    return { eligible: false, reason: 'Payout account is not approved' };
  }
  if (!gatewaySupportsPayouts) {
    return { eligible: false, reason: `Payouts are not supported for gateway '${payoutAccount?.gateway}'` };
  }
  return { eligible: true };
}

// Weekly batch — see jobs/payout-batch.job.js. Pays out every approved payout account for
// `gatewayName` with a positive wallet balance.
export async function runPayoutBatch(gatewayName) {
  const gateway = getGateway(gatewayName);
  if (!gateway.isConfigured) {
    console.log(`[Payout] Batch skipped for ${gatewayName} — gateway not configured.`);
    return null;
  }
  if (!gateway.supportsPayouts) {
    console.log(`[Payout] Batch skipped for ${gatewayName} — payouts not supported yet.`);
    return null;
  }

  const candidates = await db.select().from(driverPayoutAccounts).where(and(
    eq(driverPayoutAccounts.gateway, gatewayName),
    eq(driverPayoutAccounts.status, 'approved'),
  ));

  const [batch] = await db.insert(payoutBatches).values({ gateway: gatewayName, status: 'processing' }).returning();

  let totalAmountMinor = 0;
  let driverCount = 0;

  for (const payoutAccount of candidates) {
    const wallet = await getWallet('driver', payoutAccount.driverId);
    const check = selectEligiblePayout(wallet, payoutAccount, gateway.supportsPayouts);
    if (!check.eligible) continue;

    const result = await _executePayout({ driverId: payoutAccount.driverId, payoutAccount, wallet, gateway, batchId: batch.id });
    if (result.status === 'completed') {
      totalAmountMinor += result.amountMinor;
      driverCount += 1;
    }
  }

  await db.update(payoutBatches)
    .set({ status: 'completed', totalAmountMinor, driverCount })
    .where(eq(payoutBatches.id, batch.id));

  return { batchId: batch.id, totalAmountMinor, driverCount };
}

// idempotencyKey comes from the client's Idempotency-Key header (required — see
// payout.routes.js) so a retried/double-submitted instant-payout request returns the
// original result instead of paying out twice.
export async function initiateInstantPayout(driverId, adminId, idempotencyKey) {
  return withIdempotency('payout_initiate', idempotencyKey, adminId, async () => {
    const [payoutAccount] = await db.select().from(driverPayoutAccounts)
      .where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);
    const wallet = await getWallet('driver', driverId);
    const gateway = payoutAccount ? getGateway(payoutAccount.gateway) : null;

    const check = selectEligiblePayout(wallet, payoutAccount, gateway?.supportsPayouts ?? false);
    if (!check.eligible) throw { statusCode: 422, message: check.reason };

    return _executePayout({ driverId, payoutAccount, wallet, gateway, batchId: null });
  });
}

// Shared by both the batch job and the instant-payout route. Locks the wallet row only for
// the snapshot+insert step — released before the external gateway call, same reasoning as
// refund.service.js's _reserveRefund.
async function _executePayout({ driverId, payoutAccount, wallet, gateway, batchId }) {
  const reserved = await db.transaction(async (tx) => {
    const [lockedWallet] = await tx.select().from(wallets).where(eq(wallets.id, wallet.id)).for('update').limit(1);
    if (!lockedWallet || lockedWallet.balanceMinor <= 0) return null;

    const [payoutRow] = await tx.insert(payouts).values({
      driverId, batchId, payoutAccountId: payoutAccount.id,
      amountMinor: lockedWallet.balanceMinor, currencyCode: lockedWallet.currencyCode,
      gateway: payoutAccount.gateway, status: 'pending',
    }).returning();

    return { payoutRow, wallet: lockedWallet };
  });
  if (!reserved) return { status: 'skipped' };

  const { payoutRow } = reserved;

  let gatewayPayoutId;
  try {
    const result = await gateway.payout({
      stripeAccountId: payoutAccount.stripeAccountId,
      amountMinor: payoutRow.amountMinor,
      currencyCode: payoutRow.currencyCode,
      idempotencyKey: `payout:${payoutRow.id}`,
    });
    gatewayPayoutId = result.gatewayPayoutId;
  } catch (err) {
    // Failure holds the funds, never drops them — the wallet is untouched, so the balance
    // stays owed and visible for manual review/retry. Never silently swallowed.
    await db.update(payouts)
      .set({ status: 'failed', failureReason: err.message || 'Unknown gateway error', updatedAt: new Date() })
      .where(eq(payouts.id, payoutRow.id));
    await publishEvent(TOPICS.AUDIT_LOG, {
      actorType: 'system', action: 'PAYOUT_FAILED',
      entityType: 'payout', entityId: payoutRow.id,
      meta: { driverId, amountMinor: payoutRow.amountMinor, error: err.message },
    });
    return { status: 'failed', payoutId: payoutRow.id, amountMinor: payoutRow.amountMinor };
  }

  await db.update(payouts)
    .set({ status: 'completed', gatewayPayoutId, updatedAt: new Date() })
    .where(eq(payouts.id, payoutRow.id));

  const [clearingAccount, walletAccount] = await Promise.all([
    getOrCreateSystemAccount(`payout_clearing:${payoutRow.gateway}`, payoutRow.currencyCode),
    getOrCreateWalletAccount(reserved.wallet.id, payoutRow.currencyCode),
  ]);
  await postTransaction({
    businessType: 'driver_payout',
    idempotencyKey: `payout_ledger:${payoutRow.id}`,
    referenceType: 'payout', referenceId: payoutRow.id,
    entries: [
      {
        accountId: walletAccount.id, direction: 'debit', amountMinor: payoutRow.amountMinor, currencyCode: payoutRow.currencyCode,
        reason: 'driver_payout', description: `Payout ${payoutRow.id}`,
      },
      { accountId: clearingAccount.id, direction: 'credit', amountMinor: payoutRow.amountMinor, currencyCode: payoutRow.currencyCode },
    ],
  });

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Payout sent',
    body: `${formatMoney(payoutRow.amountMinor, payoutRow.currencyCode)} is on its way to your bank account.`,
    type: 'PAYOUT_COMPLETED',
  });

  return { status: 'completed', payoutId: payoutRow.id, amountMinor: payoutRow.amountMinor };
}

// ── Admin reads ─────────────────────────────────────────────────────────────────

export async function listPayouts(filters, page, limit, offset) {
  const conditions = [];
  if (filters.driverId) conditions.push(eq(payouts.driverId, filters.driverId));
  if (filters.status)   conditions.push(eq(payouts.status, filters.status));
  if (filters.batchId)  conditions.push(eq(payouts.batchId, filters.batchId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(payouts).where(where);
  const rows = await db.select().from(payouts).where(where)
    .orderBy(desc(payouts.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function listBatches(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(payoutBatches);
  const rows = await db.select().from(payoutBatches)
    .orderBy(desc(payoutBatches.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}
