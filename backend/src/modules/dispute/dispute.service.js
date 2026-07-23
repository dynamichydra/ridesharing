import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { payments, disputes, rides } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';

/**
 * Pure classification — extracted so it's unit-testable without a DB. Deliberately
 * approximate: Stripe's status enum is fully known (won/lost/needs_response/prevented/
 * under_review/warning_*), Razorpay's is not verified from the installed SDK. Anything that
 * isn't clearly a win or a loss is treated as still-open (a hold, no ledger resolution yet).
 */
export function classifyDisputeStatus(rawStatus) {
  const s = (rawStatus || '').toLowerCase();
  if (s.includes('won')) return 'won';
  if (s.includes('lost')) return 'lost';
  return 'open';
}

// Entry point from each domain's processWebhookEvent() when event.kind === 'dispute' — see
// ride-payment/subscription/rider-subscription .service.js. Domain-agnostic: dispatch is by
// looking up the disputed payment's gatewayPaymentId in `payments`, not by which of the three
// webhook routes received the event (see Phase 3 plan notes on why).
export async function handleDisputeEvent(event) {
  const { gatewayName, gatewayDisputeId, gatewayPaymentId, amountMinor, currencyCode, reason, status, evidenceDueBy } = event;

  const [payment] = await db.select().from(payments).where(eq(payments.gatewayPaymentId, gatewayPaymentId)).limit(1);

  const [existing] = await db.select().from(disputes)
    .where(and(eq(disputes.gateway, gatewayName), eq(disputes.gatewayDisputeId, gatewayDisputeId))).limit(1);

  if (!existing) {
    const [disputeRow] = await db.insert(disputes).values({
      paymentId: payment?.id ?? null,
      gateway: gatewayName, gatewayDisputeId, amountMinor, currencyCode, reason, status, evidenceDueBy,
    }).returning();

    if (payment) await _postDisputeHold(payment, disputeRow);

    await publishEvent(TOPICS.AUDIT_LOG, {
      actorType: 'system', action: 'DISPUTE_OPENED',
      entityType: 'dispute', entityId: disputeRow.id,
      meta: { gateway: gatewayName, gatewayDisputeId, amountMinor, paymentId: payment?.id ?? null, heldFundsMissingPayment: !payment },
    });
    return disputeRow;
  }

  if (existing.status === status) return existing; // redelivery of the same status — nothing to do

  const [updated] = await db.update(disputes)
    .set({ status, updatedAt: new Date() }).where(eq(disputes.id, existing.id)).returning();

  const classification = classifyDisputeStatus(status);
  if (classification === 'won' || classification === 'lost') {
    if (payment) await _resolveDisputeHold(payment, updated, classification);
    await publishEvent(TOPICS.AUDIT_LOG, {
      actorType: 'system', action: classification === 'won' ? 'DISPUTE_WON' : 'DISPUTE_LOST',
      entityType: 'dispute', entityId: updated.id,
      meta: { gateway: gatewayName, gatewayDisputeId, amountMinor, paymentId: payment?.id ?? null },
    });
  }
  return updated;
}

// The account that funds move to/from on the non-holding side of the entry — the driver's
// wallet for a ride fare dispute, or the relevant subscription revenue account otherwise.
// Mirrors refund.service.js's account resolution.
async function _resolveCounterAccount(payment, currencyCode) {
  if (payment.rideId) {
    const [ride] = await db.select({ driverId: rides.driverId }).from(rides).where(eq(rides.id, payment.rideId)).limit(1);
    if (!ride?.driverId) throw { statusCode: 422, message: 'Cannot process dispute — ride has no driver on record' };
    const driverWallet = await getOrCreateWallet('driver', ride.driverId);
    return getOrCreateWalletAccount(driverWallet.id, currencyCode);
  }
  const isDriverSub = !!payment.subscriptionId;
  return getOrCreateSystemAccount(
    isDriverSub ? 'platform_revenue:driver_subscriptions' : 'platform_revenue:rider_subscriptions',
    currencyCode,
  );
}

// Dispute opened — a hold, not a loss yet. Dr the counter account (driver wallet or platform
// revenue), Cr dispute_holding. allowNegative mirrors the refund reversal: the driver may
// already have more credited than they now provisionally have coming.
async function _postDisputeHold(payment, disputeRow) {
  const currencyCode = disputeRow.currencyCode;
  const [holdAccount, counterAccount] = await Promise.all([
    getOrCreateSystemAccount(`dispute_holding:${payment.gateway}`, currencyCode),
    _resolveCounterAccount(payment, currencyCode),
  ]);
  await postTransaction({
    businessType: 'dispute_hold',
    idempotencyKey: `dispute_hold:${disputeRow.id}`,
    referenceType: 'dispute', referenceId: disputeRow.id,
    entries: [
      {
        accountId: counterAccount.id, direction: 'debit', amountMinor: disputeRow.amountMinor, currencyCode,
        reason: 'dispute_hold', allowNegative: true,
      },
      { accountId: holdAccount.id, direction: 'credit', amountMinor: disputeRow.amountMinor, currencyCode },
    ],
  });
}

// Resolution — won releases the hold back to the counter account; lost moves it to the
// processor's clearing account (the funds actually left the platform for real).
async function _resolveDisputeHold(payment, disputeRow, classification) {
  const currencyCode = disputeRow.currencyCode;
  const holdAccount = await getOrCreateSystemAccount(`dispute_holding:${payment.gateway}`, currencyCode);

  if (classification === 'won') {
    const counterAccount = await _resolveCounterAccount(payment, currencyCode);
    await postTransaction({
      businessType: 'dispute_won',
      idempotencyKey: `dispute_resolve:${disputeRow.id}`,
      referenceType: 'dispute', referenceId: disputeRow.id,
      entries: [
        { accountId: holdAccount.id, direction: 'debit', amountMinor: disputeRow.amountMinor, currencyCode },
        { accountId: counterAccount.id, direction: 'credit', amountMinor: disputeRow.amountMinor, currencyCode, reason: 'dispute_won_release' },
      ],
    });
  } else {
    const clearingAccount = await getOrCreateSystemAccount(`processor_clearing:${payment.gateway}`, currencyCode);
    await postTransaction({
      businessType: 'dispute_lost',
      idempotencyKey: `dispute_resolve:${disputeRow.id}`,
      referenceType: 'dispute', referenceId: disputeRow.id,
      entries: [
        { accountId: holdAccount.id, direction: 'debit', amountMinor: disputeRow.amountMinor, currencyCode },
        { accountId: clearingAccount.id, direction: 'credit', amountMinor: disputeRow.amountMinor, currencyCode },
      ],
    });
  }
}

// ── Admin reads ─────────────────────────────────────────────────────────────────

export async function listDisputes(filters, page, limit, offset) {
  const conditions = [];
  if (filters.status)  conditions.push(eq(disputes.status, filters.status));
  if (filters.gateway) conditions.push(eq(disputes.gateway, filters.gateway));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(disputes).where(where);
  const rows = await db.select().from(disputes).where(where)
    .orderBy(desc(disputes.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getDispute(id) {
  const [dispute] = await db.select().from(disputes).where(eq(disputes.id, id)).limit(1);
  if (!dispute) throw { statusCode: 404, message: 'Dispute not found' };
  return dispute;
}

// Admin triage notes only — never touches the processor (accepting/contesting a dispute is
// out of scope here, see the Phase 3 plan).
export async function updateDisputeNotes(id, adminNotes) {
  const [dispute] = await db.update(disputes)
    .set({ adminNotes, updatedAt: new Date() }).where(eq(disputes.id, id)).returning();
  if (!dispute) throw { statusCode: 404, message: 'Dispute not found' };
  return dispute;
}
