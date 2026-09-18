import { eq, and, desc, count, sql, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  payments, refunds, subscriptions, riderSubscriptions, rides, drivers,
} from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { withIdempotency } from '../../utils/idempotency.js';
import { getGateway } from '../payment/payment.service.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';
import { publishNotification } from '../notification/notification-events.js';
import { formatMoney } from '../../utils/money.js';

/**
 * Pure validation — extracted so it's unit-testable without a DB. `alreadyRefundedMinor` is
 * the sum of this payment's prior *completed* refunds; a payment can be refunded in several
 * partial installments as long as the cumulative total never exceeds what was charged.
 */
export function validateRefundAmount(payment, alreadyRefundedMinor, requestedAmountMinor) {
  if (!Number.isInteger(requestedAmountMinor) || requestedAmountMinor <= 0) {
    return { valid: false, message: 'amountMinor must be a positive integer' };
  }
  if (payment.status !== 'captured') {
    return { valid: false, message: `Cannot refund a payment with status '${payment.status}'` };
  }
  const remaining = payment.amountMinor - alreadyRefundedMinor;
  if (remaining <= 0) {
    return { valid: false, message: 'This payment has already been fully refunded' };
  }
  if (requestedAmountMinor > remaining) {
    return { valid: false, message: `Refund amount (${requestedAmountMinor}) exceeds remaining refundable balance (${remaining})` };
  }
  return { valid: true };
}

// idempotencyKey comes from the client's Idempotency-Key header (required — see
// refund.routes.js) so a retried/double-submitted refund request returns the original
// result instead of refunding twice.
export async function initiateRefund({ paymentId, amountMinor, reason, initiatedById, idempotencyKey }) {
  return withIdempotency('refund_initiate', idempotencyKey, initiatedById, async () => {
    const { payment, refundRow, alreadyRefunded } = await _reserveRefund(paymentId, amountMinor, reason, initiatedById);
    return _executeRefund(payment, refundRow, amountMinor, alreadyRefunded, `${idempotencyKey}:${refundRow.id}`, {
      id: initiatedById, type: 'admin',
    });
  });
}

// ── Rider self-service — request only, no gateway call until an admin approves ──────

// A rider can only ever have their own ride's *latest* payment refunded, for whatever
// remains after prior completed refunds — there's no partial-amount input here (unlike the
// admin path), to keep the self-service surface simple: full remaining amount, admin reviews.
export async function requestRefund(riderId, { rideId, reason }) {
  if (!rideId) throw { statusCode: 400, message: 'rideId is required' };
  if (!reason) throw { statusCode: 400, message: 'reason is required' };

  const [ride] = await db.select().from(rides).where(and(eq(rides.id, rideId), eq(rides.riderId, riderId))).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  const [payment] = await db.select().from(payments)
    .where(eq(payments.rideId, rideId)).orderBy(desc(payments.createdAt)).limit(1);
  if (!payment) throw { statusCode: 404, message: 'No payment found for this ride' };
  if (payment.status !== 'captured') {
    throw { statusCode: 422, message: `Cannot request a refund for a payment with status '${payment.status}'` };
  }

  const [{ alreadyRefunded }] = await db.select({
    alreadyRefunded: sql`COALESCE(SUM(${refunds.amountMinor}), 0)`.mapWith(Number),
  }).from(refunds).where(and(eq(refunds.paymentId, payment.id), eq(refunds.status, 'completed')));

  const remaining = payment.amountMinor - alreadyRefunded;
  if (remaining <= 0) throw { statusCode: 422, message: 'This payment has already been fully refunded' };

  const [openRequest] = await db.select().from(refunds)
    .where(and(eq(refunds.paymentId, payment.id), inArray(refunds.status, ['requested', 'pending']))).limit(1);
  if (openRequest) throw { statusCode: 409, message: 'A refund request for this payment is already awaiting review' };

  const [refundRow] = await db.insert(refunds).values({
    paymentId: payment.id, amountMinor: remaining, currencyCode: payment.currencyCode, reason,
    status: 'requested', initiatedByType: 'rider', initiatedById: riderId,
  }).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: riderId, actorType: 'rider', action: 'REFUND_REQUESTED',
    entityType: 'refund', entityId: refundRow.id,
    meta: { rideId, paymentId: payment.id, amountMinor: remaining },
  });

  return refundRow;
}

export async function getMyRefunds(riderId, page, limit, offset) {
  const where = eq(rides.riderId, riderId);
  const [{ total }] = await db.select({ total: count() }).from(refunds)
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .innerJoin(rides, eq(payments.rideId, rides.id))
    .where(where);
  const rows = await db.select({ refund: refunds, rideId: rides.id })
    .from(refunds)
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .innerJoin(rides, eq(payments.rideId, rides.id))
    .where(where)
    .orderBy(desc(refunds.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Re-validates against the *current* already-refunded total (not the snapshot taken when the
// request was created — time may have passed and other refunds may have landed since) before
// promoting 'requested' -> 'pending' and actually calling the gateway.
export async function approveRefundRequest(refundId, adminId) {
  const { payment, refundRow, alreadyRefunded } = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(refunds).where(eq(refunds.id, refundId)).for('update').limit(1);
    if (!existing) throw { statusCode: 404, message: 'Refund request not found' };
    if (existing.status !== 'requested') throw { statusCode: 409, message: `Refund request is already '${existing.status}'` };

    const [payment] = await tx.select().from(payments).where(eq(payments.id, existing.paymentId)).for('update').limit(1);
    if (!payment) throw { statusCode: 404, message: 'Payment not found' };

    const [{ alreadyRefunded }] = await tx.select({
      alreadyRefunded: sql`COALESCE(SUM(${refunds.amountMinor}), 0)`.mapWith(Number),
    }).from(refunds).where(and(eq(refunds.paymentId, payment.id), eq(refunds.status, 'completed')));

    const check = validateRefundAmount(payment, alreadyRefunded, existing.amountMinor);
    if (!check.valid) throw { statusCode: 422, message: check.message };

    const [updated] = await tx.update(refunds)
      .set({ status: 'pending', reviewedById: adminId, reviewedAt: new Date(), updatedAt: new Date() })
      .where(eq(refunds.id, refundId)).returning();

    return { payment, refundRow: updated, alreadyRefunded };
  });

  const result = await _executeRefund(payment, refundRow, refundRow.amountMinor, alreadyRefunded, `refund_request:${refundRow.id}`, {
    id: adminId, type: 'admin',
  });

  await publishNotification('REFUND_REQUEST_APPROVED', {
    userId: refundRow.initiatedById, userType: 'rider',
    variables: { amount: formatMoney(refundRow.amountMinor, refundRow.currencyCode) },
  });

  return result;
}

export async function rejectRefundRequest(refundId, adminId, rejectionReason) {
  if (!rejectionReason) throw { statusCode: 400, message: 'rejectionReason is required' };

  const [refundRow] = await db.update(refunds)
    .set({ status: 'rejected', rejectionReason, reviewedById: adminId, reviewedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(refunds.id, refundId), eq(refunds.status, 'requested')))
    .returning();
  if (!refundRow) throw { statusCode: 409, message: 'Refund request is not in a reviewable state' };

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin', action: 'REFUND_REQUEST_REJECTED',
    entityType: 'refund', entityId: refundRow.id,
    meta: { rejectionReason },
  });
  await publishNotification('REFUND_REQUEST_REJECTED', {
    userId: refundRow.initiatedById, userType: 'rider',
    variables: { reason: rejectionReason },
  });

  return refundRow;
}

// Shared by the admin-instant path (initiateRefund) and the rider-request approval path
// (approveRefundRequest) — the gateway call + ledger reversal + cascade + audit log are
// identical either way, only who authorized it and which idempotency key namespaces the
// gateway call differ.
async function _executeRefund(payment, refundRow, amountMinor, alreadyRefunded, gatewayIdempotencyKey, actor) {
  let gatewayRefundId = null;
  try {
    if (payment.gateway !== 'cash' && payment.gateway !== 'none') {
      const gateway = getGateway(payment.gateway);
      const result = await gateway.refund({
        gatewayPaymentId: payment.gatewayPaymentId,
        amountMinor,
        currencyCode: payment.currencyCode,
        idempotencyKey: gatewayIdempotencyKey,
      });
      gatewayRefundId = result.gatewayRefundId;
    }
  } catch (err) {
    await db.update(refunds).set({ status: 'failed', updatedAt: new Date() }).where(eq(refunds.id, refundRow.id));
    throw err;
  }

  await db.update(refunds)
    .set({ status: 'completed', gatewayRefundId, updatedAt: new Date() })
    .where(eq(refunds.id, refundRow.id));

  await _postRefundLedger(payment, amountMinor, refundRow.id);

  const fullyRefunded = alreadyRefunded + amountMinor >= payment.amountMinor;
  if (fullyRefunded) {
    await db.update(payments).set({ status: 'refunded', updatedAt: new Date() }).where(eq(payments.id, payment.id));
    await _cancelLinkedSubscriptionOrRide(payment);
  }

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: actor.id, actorType: actor.type, action: 'PAYMENT_REFUNDED',
    entityType: 'payment', entityId: payment.id,
    meta: { refundId: refundRow.id, amountMinor, fullyRefunded },
  });

  const [updatedRefund] = await db.select().from(refunds).where(eq(refunds.id, refundRow.id)).limit(1);
  return { refund: updatedRefund, fullyRefunded };
}

// Locks the payment row for the validate+insert step only — the gateway call (a real network
// request) happens after this transaction commits, so we're never holding a row lock across
// an external HTTP call. Two concurrent refund requests on the same payment still can't both
// pass validation, since the second waits on the row lock and re-reads the (now updated)
// already-refunded total.
async function _reserveRefund(paymentId, amountMinor, reason, initiatedById) {
  return db.transaction(async (tx) => {
    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).for('update').limit(1);
    if (!payment) throw { statusCode: 404, message: 'Payment not found' };

    const [{ alreadyRefunded }] = await tx.select({
      alreadyRefunded: sql`COALESCE(SUM(${refunds.amountMinor}), 0)`.mapWith(Number),
    }).from(refunds).where(and(eq(refunds.paymentId, paymentId), eq(refunds.status, 'completed')));

    const check = validateRefundAmount(payment, alreadyRefunded, amountMinor);
    if (!check.valid) throw { statusCode: 422, message: check.message };

    const [refundRow] = await tx.insert(refunds).values({
      paymentId, amountMinor, currencyCode: payment.currencyCode, reason,
      status: 'pending', initiatedByType: 'admin', initiatedById,
    }).returning();

    return { payment, refundRow, alreadyRefunded };
  });
}

// Reversing entries — mirror image of the original posting (see ride-payment.service.js
// _postRideFareLedger and subscription/rider-subscription _activateSubscription).
async function _postRefundLedger(payment, amountMinor, refundId) {
  const currencyCode = payment.currencyCode;

  if (payment.rideId) {
    if (payment.gateway === 'cash') {
      const [cashMemo, revenueMemo] = await Promise.all([
        getOrCreateSystemAccount('cash_collected_memo', currencyCode),
        getOrCreateSystemAccount('driver_fare_revenue_memo', currencyCode),
      ]);
      await postTransaction({
        businessType: 'ride_fare_cash_refund',
        idempotencyKey: `refund_ledger:${refundId}`,
        referenceType: 'ride', referenceId: payment.rideId,
        entries: [
          { accountId: revenueMemo.id, direction: 'debit', amountMinor, currencyCode },
          { accountId: cashMemo.id, direction: 'credit', amountMinor, currencyCode },
        ],
      });
      return;
    }

    const [ride] = await db.select({ driverId: rides.driverId }).from(rides).where(eq(rides.id, payment.rideId)).limit(1);
    if (!ride?.driverId) throw { statusCode: 422, message: 'Cannot refund — ride has no driver on record' };
    const driverWallet = await getOrCreateWallet('driver', ride.driverId);
    const [clearingAccount, driverWalletAccount] = await Promise.all([
      getOrCreateSystemAccount(`processor_clearing:${payment.gateway}`, currencyCode),
      getOrCreateWalletAccount(driverWallet.id, currencyCode),
    ]);
    await postTransaction({
      businessType: 'ride_fare_online_refund',
      idempotencyKey: `refund_ledger:${refundId}`,
      referenceType: 'ride', referenceId: payment.rideId,
      entries: [
        {
          accountId: driverWalletAccount.id, direction: 'debit', amountMinor, currencyCode,
          reason: 'ride_fare_refund', description: `Refund for ride ${payment.rideId}`,
          // The driver may have already been credited more than they now have coming — this
          // is the one case where a wallet is allowed to go negative (they now owe the
          // platform; there's no payout execution yet to have paid it out for real).
          allowNegative: true,
        },
        { accountId: clearingAccount.id, direction: 'credit', amountMinor, currencyCode },
      ],
    });
    return;
  }

  const isDriverSub = !!payment.subscriptionId;
  const [clearingAccount, revenueAccount] = await Promise.all([
    getOrCreateSystemAccount(`processor_clearing:${payment.gateway}`, currencyCode),
    getOrCreateSystemAccount(isDriverSub ? 'platform_revenue:driver_subscriptions' : 'platform_revenue:rider_subscriptions', currencyCode),
  ]);
  await postTransaction({
    businessType: isDriverSub ? 'driver_subscription_refund' : 'rider_subscription_refund',
    idempotencyKey: `refund_ledger:${refundId}`,
    referenceType: isDriverSub ? 'subscription' : 'rider_subscription',
    referenceId: payment.subscriptionId || payment.riderSubscriptionId,
    entries: [
      { accountId: revenueAccount.id, direction: 'debit', amountMinor, currencyCode },
      { accountId: clearingAccount.id, direction: 'credit', amountMinor, currencyCode },
    ],
  });
}

// A full refund cancels whatever the payment was for — reusing the existing
// cancelled/expired states rather than inventing a new 'refunded' status those tables don't
// otherwise use.
async function _cancelLinkedSubscriptionOrRide(payment) {
  if (payment.subscriptionId) {
    const [sub] = await db.update(subscriptions)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancelNote: 'Refunded' })
      .where(eq(subscriptions.id, payment.subscriptionId))
      .returning({ driverId: subscriptions.driverId });
    if (sub) await db.update(drivers).set({ subscriptionStatus: 'expired' }).where(eq(drivers.id, sub.driverId));
  } else if (payment.riderSubscriptionId) {
    await db.update(riderSubscriptions)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancelNote: 'Refunded' })
      .where(eq(riderSubscriptions.id, payment.riderSubscriptionId));
  } else if (payment.rideId) {
    await db.update(rides).set({ paymentStatus: 'refunded' }).where(eq(rides.id, payment.rideId));
  }
}

// ── Admin reads ─────────────────────────────────────────────────────────────────

export async function listRefunds(filters, page, limit, offset) {
  const conditions = [];
  if (filters.paymentId) conditions.push(eq(refunds.paymentId, filters.paymentId));
  if (filters.status)    conditions.push(eq(refunds.status, filters.status));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(refunds).where(where);
  const rows = await db.select().from(refunds).where(where)
    .orderBy(desc(refunds.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getRefund(id) {
  const [refund] = await db.select().from(refunds).where(eq(refunds.id, id)).limit(1);
  if (!refund) throw { statusCode: 404, message: 'Refund not found' };
  return refund;
}
