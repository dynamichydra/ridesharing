import { eq, and, desc, count, isNotNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rides, payments, users, drivers } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { getGateway, gatewayForCurrency } from '../payment/payment.service.js';
import { formatMoney } from '../../utils/money.js';
import { withIdempotency } from '../../utils/idempotency.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';
import { handleDisputeEvent } from '../dispute/dispute.service.js';
import { resolveCommissionRule, computeCommission } from '../commission/commission.service.js';

// ── Rider — pay online ─────────────────────────────────────────────────────────

// idempotencyKey comes from the client's Idempotency-Key header (required — see
// ride-payment.routes.js) so a retried/double-submitted initiate request returns the
// original gateway order instead of creating a second one.
export async function initiateRidePayment(riderId, rideId, idempotencyKey) {
  return withIdempotency('ride_payment_initiate', idempotencyKey, riderId, async () => {
    const ride = await _loadPayableRide(and(eq(rides.id, rideId), eq(rides.riderId, riderId)));

    const gateway = gatewayForCurrency(ride.currencyCode);
    if (!gateway) {
      // Dev mode — this currency's gateway has no keys configured, mark paid directly
      return _markRidePaid(ride, {
        method: 'online', gateway: 'none', gatewayPaymentId: 'dev_payment_' + Date.now(), gatewayOrderId: null,
      });
    }

    const order = await gateway.createOrder({
      amountMinor: ride.finalFareMinor,
      currencyCode: ride.currencyCode,
      metadata: { rideId, riderId },
      idempotencyKey,
    });

    const [payment] = await db.insert(payments).values({
      rideId, subscriptionId: null,
      countryId: _requireCountryId(ride),
      gateway: gateway.name,
      currencyCode: ride.currencyCode,
      amountMinor: ride.finalFareMinor,
      status: 'created',
      gatewayOrderId: order.gatewayOrderId,
    }).returning();

    await db.update(rides).set({ paymentMethod: 'online', paymentStatus: 'processing' }).where(eq(rides.id, rideId));

    return { ...order, paymentAttemptId: payment.id };
  });
}

export async function verifyRidePayment(riderId, rideId, orderRef, paymentRef, signature) {
  const ride = await _loadPayableRide(and(eq(rides.id, rideId), eq(rides.riderId, riderId)));

  const gateway = gatewayForCurrency(ride.currencyCode);
  if (!gateway) {
    return _markRidePaid(ride, {
      method: 'online', gateway: 'none', gatewayPaymentId: paymentRef, gatewayOrderId: orderRef,
    });
  }

  const verified = await gateway.verifyPayment({ orderRef, paymentRef, signature });
  if (!verified) throw { statusCode: 400, message: 'Payment verification failed' };

  const [attempt] = await db.select().from(payments)
    .where(and(eq(payments.gatewayOrderId, orderRef), eq(payments.rideId, rideId))).limit(1);

  return _markRidePaid(ride, {
    method: 'online', gateway: gateway.name, gatewayPaymentId: paymentRef, gatewayOrderId: orderRef,
    paymentAttemptId: attempt?.id,
  });
}

// ── Driver — record cash collection ────────────────────────────────────────────

export async function recordCashCollection(driverId, rideId) {
  const ride = await _loadPayableRide(and(eq(rides.id, rideId), eq(rides.driverId, driverId)));

  const [payment] = await db.insert(payments).values({
    rideId, subscriptionId: null,
    countryId: _requireCountryId(ride),
    gateway: 'cash',
    currencyCode: ride.currencyCode,
    amountMinor: ride.finalFareMinor,
    status: 'captured',
    gatewayOrderId: null,
    gatewayPaymentId: null,
  }).returning();

  const updated = await _markRidePaid(ride, { method: 'cash', gateway: 'cash', paymentAttemptId: payment.id });

  // Fire after the state-changing write lands — an audit-log hiccup shouldn't leave the
  // payments row captured while the ride is still stuck showing unpaid.
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: driverId, actorType: 'driver',
    action: 'RIDE_CASH_COLLECTED', entityType: 'ride', entityId: rideId,
  });

  return updated;
}

// ── Gateway webhook ─────────────────────────────────────────────────────────────
// Split in two so the route can verify+parse synchronously (reject bad signatures outright)
// while the actual business logic runs asynchronously via the webhook-processing job — see
// ride-payment.routes.js and jobs/webhook-processing.job.js.

// Rejects unsigned/invalid webhooks outright — never queues something we can't verify.
export function parseAndVerifyWebhook(gatewayName, rawBody, signature) {
  const gateway = getGateway(gatewayName);
  if (!gateway.isConfigured) {
    console.log(`[RidePayment] ${gatewayName} webhook received but not configured — ignoring.`);
    return null;
  }
  if (!gateway.verifyWebhookSignature(rawBody, signature)) {
    throw { statusCode: 400, message: 'Invalid webhook signature' };
  }
  const event = gateway.parseWebhookEvent(rawBody, signature);
  return event ? { ...event, gatewayName } : null;
}

export async function processWebhookEvent(event) {
  // Dispute events can land on any of the three webhook routes — dispatch by looking up the
  // disputed payment, not by which route received it. See dispute.service.js.
  if (event.kind === 'dispute') return handleDisputeEvent(event);

  const { rideId } = event.metadata || {};
  if (!rideId) return;

  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (ride && ride.paymentStatus !== 'paid') {
    const [attempt] = await db.select().from(payments)
      .where(and(eq(payments.gatewayOrderId, event.orderRef), eq(payments.rideId, rideId))).limit(1);
    await _markRidePaid(ride, {
      method: 'online', gateway: event.gatewayName, gatewayPaymentId: event.paymentRef, gatewayOrderId: event.orderRef,
      paymentAttemptId: attempt?.id,
    });
  }
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function getRidePaymentStatus(rideId, requester) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  if (requester.role === 'rider' && ride.riderId !== requester.id) throw { statusCode: 403, message: 'Not your ride' };
  if (requester.role === 'driver' && ride.driverId !== requester.id) throw { statusCode: 403, message: 'Not your ride' };

  const [payment] = await db.select().from(payments)
    .where(eq(payments.rideId, rideId)).orderBy(desc(payments.createdAt)).limit(1);

  return {
    rideId: ride.id, status: ride.status,
    finalFareMinor: ride.finalFareMinor, currencyCode: ride.currencyCode,
    paymentMethod: ride.paymentMethod, paymentStatus: ride.paymentStatus,
    payment: payment || null,
  };
}

// Full billing document for one ride — rider/driver see their own, admin sees any.
// Only available once a ride is completed (finalFareMinor is only known at that point).
export async function getRideInvoice(rideId, requester) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  if (requester.role === 'rider' && ride.riderId !== requester.id) throw { statusCode: 403, message: 'Not your ride' };
  if (requester.role === 'driver' && ride.driverId !== requester.id) throw { statusCode: 403, message: 'Not your ride' };
  if (ride.status !== 'completed') throw { statusCode: 409, message: 'Invoice is only available for completed rides' };

  const [rider] = await db.select({ name: users.name, phone: users.phone })
    .from(users).where(eq(users.id, ride.riderId)).limit(1);
  const [driver] = ride.driverId
    ? await db.select({ name: drivers.name, phone: drivers.phone }).from(drivers).where(eq(drivers.id, ride.driverId)).limit(1)
    : [null];
  const [payment] = await db.select().from(payments)
    .where(eq(payments.rideId, rideId)).orderBy(desc(payments.createdAt)).limit(1);

  return {
    invoiceNumber: `INV-${ride.id.slice(0, 8).toUpperCase()}`,
    ride: {
      id: ride.id, pickupAddress: ride.pickupAddress, dropAddress: ride.dropAddress,
      requestedAt: ride.requestedAt, completedAt: ride.completedAt,
      distanceKm: ride.distanceKm, durationMin: ride.durationMin,
    },
    rider: rider || null,
    driver: driver || null,
    currencyCode: ride.currencyCode,
    fareBreakdown: ride.fareSnapshot?.breakdown || {},
    estimatedFareMinor: ride.estimatedFareMinor,
    finalFareMinor: ride.finalFareMinor,
    payment: {
      method: ride.paymentMethod, status: ride.paymentStatus,
      gateway: payment?.gateway ?? null, gatewayPaymentId: payment?.gatewayPaymentId ?? null,
      paidAt: payment?.status === 'captured' ? payment.updatedAt : null,
    },
  };
}

export async function getMyRidePayments(riderId, page, limit, offset) {
  const where = and(eq(rides.riderId, riderId), isNotNull(payments.rideId));
  const [{ total }] = await db.select({ total: count() }).from(payments)
    .innerJoin(rides, eq(payments.rideId, rides.id)).where(where);
  const rows = await db.select({ payment: payments, ride: rides })
    .from(payments)
    .innerJoin(rides, eq(payments.rideId, rides.id))
    .where(where)
    .orderBy(desc(payments.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function listRidePaymentsAdmin(filters, page, limit, offset) {
  const conditions = [isNotNull(payments.rideId)];
  if (filters.rideId) conditions.push(eq(payments.rideId, filters.rideId));
  if (filters.status) conditions.push(eq(payments.status, filters.status));
  if (filters.gateway) conditions.push(eq(payments.gateway, filters.gateway));
  if (filters.countryId) conditions.push(eq(payments.countryId, filters.countryId));
  if (filters.paymentMethod) conditions.push(eq(rides.paymentMethod, filters.paymentMethod));
  if (filters.riderId) conditions.push(eq(rides.riderId, filters.riderId));
  if (filters.driverId) conditions.push(eq(rides.driverId, filters.driverId));
  const where = and(...conditions);

  const [{ total }] = await db.select({ total: count() }).from(payments)
    .innerJoin(rides, eq(payments.rideId, rides.id)).where(where);
  const rows = await db.select({ payment: payments, ride: rides })
    .from(payments)
    .innerJoin(rides, eq(payments.rideId, rides.id))
    .where(where)
    .orderBy(desc(payments.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// ── Internals ───────────────────────────────────────────────────────────────────

function _requireCountryId(ride) {
  if (!ride.countryId) throw { statusCode: 422, message: 'Ride has no resolved country — cannot record payment' };
  return ride.countryId;
}

async function _loadPayableRide(ownershipCondition) {
  const [ride] = await db.select().from(rides).where(ownershipCondition).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'completed') throw { statusCode: 409, message: 'Ride is not completed yet' };
  if (ride.paymentStatus === 'paid') throw { statusCode: 409, message: 'Ride has already been paid for' };
  return ride;
}

// Resolves the commission rule for this ride and the driver's subscription status *at
// settlement time* (not at request time — a driver's subscription can lapse mid-ride), and
// stamps the breakdown onto ride.fareSnapshot so getRideInvoice/getRidePaymentStatus can show
// it without a schema change to `rides`. Returns null (no commission applied) if there's no
// driver to charge one against.
async function _resolveRideCommission(ride) {
  if (!ride.driverId) return null;
  const [driver] = await db.select({ subscriptionStatus: drivers.subscriptionStatus })
    .from(drivers).where(eq(drivers.id, ride.driverId)).limit(1);

  const rule = await resolveCommissionRule(ride.vehicleTypeId, ride.countryId);
  const breakdown = computeCommission({
    finalFareMinor: ride.finalFareMinor,
    rule,
    isSubscriber: driver?.subscriptionStatus === 'active',
  });

  await db.update(rides).set({
    fareSnapshot: { ...(ride.fareSnapshot || {}), commission: { ruleId: rule.id, ...breakdown } },
  }).where(eq(rides.id, ride.id));

  return breakdown;
}

// Online fares: Dr the gateway's processor-clearing account, Cr the driver's wallet for their
// post-commission earnings, Cr platform_commission_revenue for the booking fee + rate cut —
// this is what actually makes an online fare payable to the driver (previously nothing did,
// and nothing deducted a platform cut either).
// Cash fares: the existing net-zero memo (driver already holds the cash, wallet untouched)
// still records that revenue was recognized without the platform custodying funds — plus a
// real debit against the driver's wallet for the commission they owe on cash already in hand,
// which can legitimately run the wallet negative (allowNegative) for a mostly-cash driver, the
// same way a refund clawback already can elsewhere in this codebase.
// `idempotencyKey` is per-ride so a duplicate call (e.g. verify + webhook both landing) posts
// once, not twice.
async function _postRideFareLedger(ride, paymentInfo) {
  const currencyCode = ride.currencyCode;
  const commission = await _resolveRideCommission(ride);

  if (paymentInfo.method === 'online') {
    if (!ride.driverId) return; // no driver to credit — shouldn't happen for a completed ride
    const driverWallet = await getOrCreateWallet('driver', ride.driverId);
    const [clearingAccount, driverWalletAccount, commissionAccount] = await Promise.all([
      getOrCreateSystemAccount(`processor_clearing:${paymentInfo.gateway}`, currencyCode),
      getOrCreateWalletAccount(driverWallet.id, currencyCode),
      getOrCreateSystemAccount('platform_commission_revenue', currencyCode),
    ]);
    const entries = [
      { accountId: clearingAccount.id, direction: 'debit', amountMinor: ride.finalFareMinor, currencyCode },
      {
        accountId: driverWalletAccount.id, direction: 'credit', amountMinor: commission.driverEarningsMinor, currencyCode,
        reason: 'ride_fare_online', description: `Fare for ride ${ride.id}`,
      },
    ];
    // No cut this ride (e.g. a 0% rule) -> driverEarningsMinor already equals finalFareMinor,
    // so the entries above alone balance; only add a third leg when there's really a fee to book.
    if (commission.commissionMinor > 0) {
      entries.push({ accountId: commissionAccount.id, direction: 'credit', amountMinor: commission.commissionMinor, currencyCode });
    }
    await postTransaction({
      businessType: 'ride_fare_online',
      idempotencyKey: `ride_fare_online:${ride.id}`,
      referenceType: 'ride',
      referenceId: ride.id,
      entries,
    });
  } else if (paymentInfo.method === 'cash') {
    const [cashMemo, revenueMemo] = await Promise.all([
      getOrCreateSystemAccount('cash_collected_memo', currencyCode),
      getOrCreateSystemAccount('driver_fare_revenue_memo', currencyCode),
    ]);
    await postTransaction({
      businessType: 'ride_fare_cash',
      idempotencyKey: `ride_fare_cash:${ride.id}`,
      referenceType: 'ride',
      referenceId: ride.id,
      entries: [
        { accountId: cashMemo.id, direction: 'debit', amountMinor: ride.finalFareMinor, currencyCode },
        { accountId: revenueMemo.id, direction: 'credit', amountMinor: ride.finalFareMinor, currencyCode },
      ],
    });

    if (ride.driverId && commission?.commissionMinor > 0) {
      const driverWallet = await getOrCreateWallet('driver', ride.driverId);
      const [driverWalletAccount, commissionAccount] = await Promise.all([
        getOrCreateWalletAccount(driverWallet.id, currencyCode),
        getOrCreateSystemAccount('platform_commission_revenue', currencyCode),
      ]);
      await postTransaction({
        businessType: 'ride_commission_cash',
        idempotencyKey: `ride_commission_cash:${ride.id}`,
        referenceType: 'ride',
        referenceId: ride.id,
        entries: [
          {
            accountId: driverWalletAccount.id, direction: 'debit', amountMinor: commission.commissionMinor, currencyCode,
            reason: 'ride_commission_cash', description: `Commission owed for cash ride ${ride.id}`, allowNegative: true,
          },
          { accountId: commissionAccount.id, direction: 'credit', amountMinor: commission.commissionMinor, currencyCode },
        ],
      });
    }
  }
}

async function _markRidePaid(ride, paymentInfo) {
  if (paymentInfo.paymentAttemptId) {
    await db.update(payments)
      .set({ status: 'captured', gatewayPaymentId: paymentInfo.gatewayPaymentId, updatedAt: new Date() })
      .where(eq(payments.id, paymentInfo.paymentAttemptId));
  } else {
    await db.insert(payments).values({
      rideId: ride.id, subscriptionId: null,
      countryId: _requireCountryId(ride),
      gateway: paymentInfo.gateway,
      currencyCode: ride.currencyCode,
      amountMinor: ride.finalFareMinor,
      status: 'captured',
      gatewayOrderId: paymentInfo.gatewayOrderId,
      gatewayPaymentId: paymentInfo.gatewayPaymentId,
    });
  }

  await _postRideFareLedger(ride, paymentInfo);

  const [updated] = await db.update(rides)
    .set({ paymentMethod: paymentInfo.method, paymentStatus: 'paid' })
    .where(eq(rides.id, ride.id)).returning();

  await publishEvent(TOPICS.PAYMENT_SUCCESS, {
    id: ride.id, rideId: ride.id, riderId: ride.riderId, driverId: ride.driverId,
    amountMinor: ride.finalFareMinor, currencyCode: ride.currencyCode, method: paymentInfo.method,
  });
  const amountLabel = formatMoney(ride.finalFareMinor, ride.currencyCode);
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: ride.riderId,
    type: 'PAYMENT_SUCCESS', title: 'Payment received',
    body: `Your payment of ${amountLabel} for this ride has been recorded.`,
  });
  if (ride.driverId) {
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver', userId: ride.driverId,
      type: 'PAYMENT_SUCCESS', title: 'Payment received',
      body: `Payment of ${amountLabel} (${paymentInfo.method}) recorded for your ride.`,
    });
  }

  return updated;
}
