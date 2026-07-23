import { eq, and, desc, count, sql } from 'drizzle-orm';
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

    let gatewayRefundId = null;
    try {
      if (payment.gateway !== 'cash' && payment.gateway !== 'none') {
        const gateway = getGateway(payment.gateway);
        const result = await gateway.refund({
          gatewayPaymentId: payment.gatewayPaymentId,
          amountMinor,
          currencyCode: payment.currencyCode,
          idempotencyKey: `${idempotencyKey}:${refundRow.id}`,
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
      await db.update(payments).set({ status: 'refunded', updatedAt: new Date() }).where(eq(payments.id, paymentId));
      await _cancelLinkedSubscriptionOrRide(payment);
    }

    await publishEvent(TOPICS.AUDIT_LOG, {
      actorId: initiatedById, actorType: 'admin', action: 'PAYMENT_REFUNDED',
      entityType: 'payment', entityId: paymentId,
      meta: { refundId: refundRow.id, amountMinor, fullyRefunded },
    });

    const [updatedRefund] = await db.select().from(refunds).where(eq(refunds.id, refundRow.id)).limit(1);
    return { refund: updatedRefund, fullyRefunded };
  });
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
