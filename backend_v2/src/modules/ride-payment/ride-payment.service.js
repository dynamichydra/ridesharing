import { eq, and, desc, count, isNotNull, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rides, payments, users, drivers, rideFareSplits, cashCollections } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { getGateway, gatewayForCurrency } from '../payment/payment.service.js';
import { formatMoney } from '../../utils/money.js';
import { withIdempotency } from '../../utils/idempotency.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';
import { handleDisputeEvent } from '../dispute/dispute.service.js';
import { resolveCommissionRule, computeCommission } from '../commission/commission.service.js';
import { publishNotification } from '../notification/notification-events.js';
import { emitToRider, emitToRideRoom } from '../../kafka/consumers/index.js';


// ── Rider — pay online ─────────────────────────────────────────────────────────

// idempotencyKey comes from the client's Idempotency-Key header (required — see
// ride-payment.routes.js) so a retried/double-submitted initiate request returns the
// original gateway order instead of creating a second one.
export async function initiateRidePayment(riderId, rideId, idempotencyKey) {
  return withIdempotency('ride_payment_initiate', idempotencyKey, riderId, async () => {
    const { ride, isPrimary } = await _loadPayableRideForUser(rideId, riderId);

    const acceptedSplits = await db.select()
      .from(rideFareSplits)
      .where(and(eq(rideFareSplits.rideId, rideId), eq(rideFareSplits.status, 'accepted')));

    let payAmountMinor = ride.finalFareMinor;
    if (acceptedSplits.length > 0) {
      const totalParticipants = acceptedSplits.length + 1;
      const baseShare = Math.floor(ride.finalFareMinor / totalParticipants);
      if (isPrimary) {
        payAmountMinor = ride.finalFareMinor - (baseShare * acceptedSplits.length);
      } else {
        payAmountMinor = baseShare;
      }
    }

    const gateway = gatewayForCurrency(ride.currencyCode);
    if (!gateway) {
      return _markRidePaid(ride, {
        method: 'online', gateway: 'none', gatewayPaymentId: 'dev_payment_' + Date.now(), gatewayOrderId: null,
        amountMinor: payAmountMinor, payerId: riderId,
      });
    }

    const order = await gateway.createOrder({
      amountMinor: payAmountMinor,
      currencyCode: ride.currencyCode,
      metadata: { rideId, riderId },
      idempotencyKey,
    });

    const [payment] = await db.insert(payments).values({
      rideId, subscriptionId: null,
      countryId: _requireCountryId(ride),
      gateway: gateway.name,
      currencyCode: ride.currencyCode,
      amountMinor: payAmountMinor,
      status: 'created',
      gatewayOrderId: order.gatewayOrderId,
      metadata: { payerId: riderId },
    }).returning();

    await db.update(rides).set({ paymentMethod: 'online', paymentStatus: 'processing' }).where(eq(rides.id, rideId));

    return { ...order, paymentAttemptId: payment.id };
  });
}

export async function verifyRidePayment(riderId, rideId, orderRef, paymentRef, signature) {
  const { ride } = await _loadPayableRideForUser(rideId, riderId);

  const gateway = gatewayForCurrency(ride.currencyCode);
  if (!gateway) {
    const acceptedSplits = await db.select()
      .from(rideFareSplits)
      .where(and(eq(rideFareSplits.rideId, rideId), eq(rideFareSplits.status, 'accepted')));
    let payAmountMinor = ride.finalFareMinor;
    if (acceptedSplits.length > 0) {
      const totalParticipants = acceptedSplits.length + 1;
      const baseShare = Math.floor(ride.finalFareMinor / totalParticipants);
      if (ride.riderId === riderId) {
        payAmountMinor = ride.finalFareMinor - (baseShare * acceptedSplits.length);
      } else {
        payAmountMinor = baseShare;
      }
    }
    return _markRidePaid(ride, {
      method: 'online', gateway: 'none', gatewayPaymentId: paymentRef, gatewayOrderId: orderRef,
      amountMinor: payAmountMinor, payerId: riderId,
    });
  }

  const verified = await gateway.verifyPayment({ orderRef, paymentRef, signature });
  if (!verified) throw { statusCode: 400, message: 'Payment verification failed' };

  const [attempt] = await db.select().from(payments)
    .where(and(eq(payments.gatewayOrderId, orderRef), eq(payments.rideId, rideId))).limit(1);

  return _markRidePaid(ride, {
    method: 'online', gateway: gateway.name, gatewayPaymentId: paymentRef, gatewayOrderId: orderRef,
    paymentAttemptId: attempt?.id,
    amountMinor: attempt?.amountMinor, payerId: riderId,
  });
}

// ── Driver — record cash collection ────────────────────────────────────────────

export async function recordCashCollection(driverId, rideId, collectedAmountMinor = null) {
  const ride = await _loadPayableRide(and(eq(rides.id, rideId), eq(rides.driverId, driverId)));

  const finalCollectedMinor = collectedAmountMinor ?? ride.finalFareMinor;

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

  // Calculate platform commission for cash auditing & settlement tracking
  let commissionMinor = 0;
  try {
    const rule = await resolveCommissionRule({ countryId: ride.countryId, cityId: ride.cityId, serviceType: ride.serviceType });
    const commResult = computeCommission(ride.finalFareMinor, rule);
    commissionMinor = commResult?.commissionMinor || Math.round(ride.finalFareMinor * 0.2);
  } catch {
    commissionMinor = Math.round(ride.finalFareMinor * 0.2);
  }

  // Insert cash collection record for admin cash management & reconciliation
  try {
    const isMismatch = finalCollectedMinor !== ride.finalFareMinor;
    await db.insert(cashCollections).values({
      rideId,
      driverId,
      expectedAmountMinor: ride.finalFareMinor,
      collectedAmountMinor: finalCollectedMinor,
      platformCommissionMinor: commissionMinor,
      currencyCode: ride.currencyCode || 'INR',
      status: isMismatch ? 'mismatch' : 'reported',
      reportedAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to log cash_collections entry:', err);
  }

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

// ── Fare Split ───────────────────────────────────────────────────────────────

export async function inviteToFareSplit(rideId, inviterId, phone) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.riderId !== inviterId) {
    throw { statusCode: 403, message: 'Only the primary rider can invite co-riders to split the fare' };
  }

  const allowedStatuses = ['searching', 'accepted', 'arriving', 'started'];
  if (!allowedStatuses.includes(ride.status)) {
    throw { statusCode: 400, message: `Cannot split fare for a ride in status: ${ride.status}` };
  }

  const [invitee] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!invitee) throw { statusCode: 404, message: 'Invitee user not found' };
  if (invitee.id === inviterId) {
    throw { statusCode: 400, message: 'You cannot invite yourself to split the fare' };
  }

  const [existing] = await db.select()
    .from(rideFareSplits)
    .where(and(
      eq(rideFareSplits.rideId, rideId),
      eq(rideFareSplits.inviteeId, invitee.id),
      inArray(rideFareSplits.status, ['pending', 'accepted'])
    )).limit(1);

  if (existing) {
    throw { statusCode: 409, message: `This rider is already invited to split (status: ${existing.status})` };
  }

  const [split] = await db.insert(rideFareSplits).values({
    rideId,
    inviterId,
    inviteeId: invitee.id,
    status: 'pending',
    paymentStatus: 'pending',
  }).returning();

  const [inviter] = await db.select({ name: users.name, phone: users.phone })
    .from(users).where(eq(users.id, inviterId)).limit(1);

  const payload = {
    rideId,
    splitId: split.id,
    inviterId,
    inviterName: inviter?.name || 'Primary Rider',
    inviteeId: invitee.id,
    inviteeName: invitee.name,
    status: 'pending',
    createdAt: split.createdAt,
  };

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider',
    userId: invitee.id,
    type: 'FARE_SPLIT_INVITE',
    title: 'Fare Split Invitation',
    body: `${inviter?.name || 'A rider'} has invited you to split a ride fare.`,
    rideId,
  }).catch((err) => console.error('[FareSplit] publish event failed:', err.message));

  emitToRider(invitee.id, 'fare_split:invited', payload);
  emitToRideRoom(rideId, 'fare_split:updated', payload);

  return { ...split, invitee: { id: invitee.id, name: invitee.name, phone: invitee.phone } };
}

export async function respondToFareSplit(rideId, inviteeId, accept) {
  const [split] = await db.select().from(rideFareSplits).where(and(
    eq(rideFareSplits.rideId, rideId),
    eq(rideFareSplits.inviteeId, inviteeId),
    eq(rideFareSplits.status, 'pending')
  )).limit(1);

  if (!split) throw { statusCode: 404, message: 'No pending split invitation found for this ride' };

  const newStatus = accept ? 'accepted' : 'declined';
  const [updated] = await db.update(rideFareSplits)
    .set({
      status: newStatus,
      updatedAt: new Date(),
    })
    .where(eq(rideFareSplits.id, split.id))
    .returning();

  const [invitee] = await db.select({ name: users.name }).from(users).where(eq(users.id, inviteeId)).limit(1);

  const payload = {
    rideId,
    splitId: split.id,
    inviterId: split.inviterId,
    inviteeId: split.inviteeId,
    inviteeName: invitee?.name || 'Co-rider',
    status: newStatus,
    updatedAt: updated.updatedAt,
  };

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider',
    userId: split.inviterId,
    type: 'FARE_SPLIT_RESPONSE',
    title: 'Fare Split Update',
    body: `${invitee?.name || 'A co-rider'} has ${accept ? 'accepted' : 'declined'} your fare split invitation.`,
    rideId,
  }).catch((err) => console.error('[FareSplit] publish event failed:', err.message));

  emitToRider(split.inviterId, 'fare_split:responded', payload);
  emitToRideRoom(rideId, 'fare_split:updated', payload);

  return updated;
}

export async function cancelFareSplitInvite(rideId, requesterId, splitId) {
  const [split] = await db.select().from(rideFareSplits).where(and(
    eq(rideFareSplits.id, splitId),
    eq(rideFareSplits.rideId, rideId)
  )).limit(1);

  if (!split) throw { statusCode: 404, message: 'Fare split invitation not found' };

  if (split.inviterId !== requesterId && split.inviteeId !== requesterId) {
    throw { statusCode: 403, message: 'Not authorized to cancel this fare split invitation' };
  }

  if (split.status === 'cancelled' || split.status === 'expired') {
    throw { statusCode: 409, message: `Fare split invitation is already ${split.status}` };
  }

  const [updated] = await db.update(rideFareSplits)
    .set({
      status: 'cancelled',
      updatedAt: new Date(),
    })
    .where(eq(rideFareSplits.id, split.id))
    .returning();

  const payload = {
    rideId,
    splitId: split.id,
    inviterId: split.inviterId,
    inviteeId: split.inviteeId,
    status: 'cancelled',
  };

  emitToRider(split.inviterId, 'fare_split:cancelled', payload);
  emitToRider(split.inviteeId, 'fare_split:cancelled', payload);
  emitToRideRoom(rideId, 'fare_split:updated', payload);

  return updated;
}

export async function getRideFareSplits(rideId, userId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };

  const splits = await db.select({
    id: rideFareSplits.id,
    rideId: rideFareSplits.rideId,
    inviterId: rideFareSplits.inviterId,
    inviteeId: rideFareSplits.inviteeId,
    status: rideFareSplits.status,
    splitAmountMinor: rideFareSplits.splitAmountMinor,
    paymentStatus: rideFareSplits.paymentStatus,
    paymentMethod: rideFareSplits.paymentMethod,
    createdAt: rideFareSplits.createdAt,
    updatedAt: rideFareSplits.updatedAt,
    inviteeName: users.name,
    inviteePhone: users.phone,
  })
  .from(rideFareSplits)
  .leftJoin(users, eq(rideFareSplits.inviteeId, users.id))
  .where(eq(rideFareSplits.rideId, rideId));

  const isParticipant = splits.some(r => r.inviterId === userId || r.inviteeId === userId);

  if (ride.riderId !== userId && !isParticipant) {
    throw { statusCode: 403, message: 'Not authorized to view fare splits for this ride' };
  }

  const acceptedSplits = splits.filter(s => s.status === 'accepted');
  const totalParticipants = acceptedSplits.length + 1;
  const targetFare = ride.finalFareMinor || ride.estimatedFareMinor || 0;
  const projectedShare = Math.floor(targetFare / totalParticipants);
  const primaryShare = targetFare - (projectedShare * acceptedSplits.length);

  return {
    rideId: ride.id,
    rideStatus: ride.status,
    totalFareMinor: targetFare,
    totalParticipants,
    primaryRiderShareMinor: primaryShare,
    coRiderShareMinor: projectedShare,
    splits,
  };
}

export async function payFareSplitWithWallet(rideId, riderId, idempotencyKey) {
  return withIdempotency('fare_split_wallet_pay', idempotencyKey, riderId, async () => {
    const { ride, isPrimary } = await _loadPayableRideForUser(rideId, riderId);

    const acceptedSplits = await db.select()
      .from(rideFareSplits)
      .where(and(eq(rideFareSplits.rideId, rideId), eq(rideFareSplits.status, 'accepted')));

    let payAmountMinor = ride.finalFareMinor;
    if (acceptedSplits.length > 0) {
      const totalParticipants = acceptedSplits.length + 1;
      const baseShare = Math.floor(ride.finalFareMinor / totalParticipants);
      if (isPrimary) {
        payAmountMinor = ride.finalFareMinor - (baseShare * acceptedSplits.length);
      } else {
        payAmountMinor = baseShare;
      }
    }

    const wallet = await getOrCreateWallet('rider', riderId);
    if (wallet.balanceMinor < payAmountMinor) {
      throw { statusCode: 422, message: `Insufficient wallet balance (${wallet.balanceMinor} < ${payAmountMinor})` };
    }

    const currencyCode = ride.currencyCode;
    const [walletAccount, clearingAccount] = await Promise.all([
      getOrCreateWalletAccount(wallet.id, currencyCode),
      getOrCreateSystemAccount('processor_clearing:wallet', currencyCode),
    ]);

    await postTransaction({
      businessType: 'ride_fare_wallet',
      idempotencyKey: `ride_fare_wallet:${rideId}:${riderId}`,
      referenceType: 'ride',
      referenceId: rideId,
      entries: [
        {
          accountId: walletAccount.id, direction: 'debit', amountMinor: payAmountMinor, currencyCode,
          reason: 'ride_fare_wallet', description: `Wallet payment for split ride ${rideId}`,
        },
        { accountId: clearingAccount.id, direction: 'credit', amountMinor: payAmountMinor, currencyCode },
      ],
    });

    if (!isPrimary) {
      await db.update(rideFareSplits)
        .set({ paymentStatus: 'paid', paymentMethod: 'wallet', updatedAt: new Date() })
        .where(and(eq(rideFareSplits.rideId, rideId), eq(rideFareSplits.inviteeId, riderId)));
    }

    return _markRidePaid(ride, {
      method: 'wallet', gateway: 'wallet', gatewayPaymentId: `wallet_pay_${Date.now()}`,
      amountMinor: payAmountMinor, payerId: riderId,
    });
  });
}

export async function expirePendingFareSplits(rideId, isCancelled = false) {
  const newStatus = isCancelled ? 'cancelled' : 'expired';
  const targetStatuses = isCancelled ? ['pending', 'accepted'] : ['pending'];

  await db.update(rideFareSplits)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(and(
      eq(rideFareSplits.rideId, rideId),
      inArray(rideFareSplits.status, targetStatuses)
    ));
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

async function _loadPayableRideForUser(rideId, userId) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: 'Ride not found' };
  if (ride.status !== 'completed') throw { statusCode: 409, message: 'Ride is not completed yet' };
  if (ride.paymentStatus === 'paid') throw { statusCode: 409, message: 'Ride has already been paid for' };

  if (ride.riderId === userId) {
    return { ride, isPrimary: true };
  }

  const [split] = await db.select()
    .from(rideFareSplits)
    .where(and(
      eq(rideFareSplits.rideId, rideId),
      eq(rideFareSplits.inviteeId, userId),
      eq(rideFareSplits.status, 'accepted')
    )).limit(1);

  if (split) {
    return { ride, isPrimary: false };
  }

  throw { statusCode: 403, message: 'You are not authorized to pay for this ride' };
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

  const acceptedSplits = await db.select()
    .from(rideFareSplits)
    .where(and(eq(rideFareSplits.rideId, ride.id), eq(rideFareSplits.status, 'accepted')));

  let splitAmount = null;
  let inviterShare = ride.finalFareMinor;

  if (acceptedSplits.length > 0) {
    const totalParticipants = acceptedSplits.length + 1;
    splitAmount = Math.floor(ride.finalFareMinor / totalParticipants);
    inviterShare = ride.finalFareMinor - (splitAmount * acceptedSplits.length);

    for (const split of acceptedSplits) {
      await db.update(rideFareSplits)
        .set({ splitAmountMinor: splitAmount, updatedAt: new Date() })
        .where(eq(rideFareSplits.id, split.id));
    }
  }

  if (paymentInfo.method === 'online') {
    if (!ride.driverId) return;
    const driverWallet = await getOrCreateWallet('driver', ride.driverId);
    const [driverWalletAccount, commissionAccount] = await Promise.all([
      getOrCreateWalletAccount(driverWallet.id, currencyCode),
      getOrCreateSystemAccount('platform_commission_revenue', currencyCode),
    ]);

    const entries = [];

    if (acceptedSplits.length === 0) {
      const clearingAccount = await getOrCreateSystemAccount(`processor_clearing:${paymentInfo.gateway}`, currencyCode);
      entries.push({ accountId: clearingAccount.id, direction: 'debit', amountMinor: ride.finalFareMinor, currencyCode });
    } else {
      const primaryClearing = await getOrCreateSystemAccount(`processor_clearing:${paymentInfo.gateway}`, currencyCode);
      entries.push({ accountId: primaryClearing.id, direction: 'debit', amountMinor: inviterShare, currencyCode });

      for (const split of acceptedSplits) {
        const inviteeClearing = await getOrCreateSystemAccount(`processor_clearing:${paymentInfo.gateway}`, currencyCode);
        entries.push({ accountId: inviteeClearing.id, direction: 'debit', amountMinor: splitAmount, currencyCode });
      }
    }

    entries.push({
      accountId: driverWalletAccount.id, direction: 'credit', amountMinor: commission.driverEarningsMinor, currencyCode,
      reason: 'ride_fare_online', description: `Fare for ride ${ride.id}`,
    });

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
  const payerId = paymentInfo.payerId;
  const payAmountMinor = paymentInfo.amountMinor;

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
      amountMinor: payAmountMinor || ride.finalFareMinor,
      status: 'captured',
      gatewayOrderId: paymentInfo.gatewayOrderId,
      gatewayPaymentId: paymentInfo.gatewayPaymentId,
      metadata: payerId ? { payerId } : null,
    });
  }

  const allCaptured = await db.select({ amountMinor: payments.amountMinor })
    .from(payments)
    .where(and(eq(payments.rideId, ride.id), eq(payments.status, 'captured')));

  const totalCaptured = allCaptured.reduce((sum, p) => sum + p.amountMinor, 0);

  if (totalCaptured >= ride.finalFareMinor) {
    await _postRideFareLedger(ride, paymentInfo);

    const [updated] = await db.update(rides)
      .set({ paymentMethod: paymentInfo.method, paymentStatus: 'paid' })
      .where(eq(rides.id, ride.id)).returning();

    await publishEvent(TOPICS.PAYMENT_SUCCESS, {
      id: ride.id, rideId: ride.id, riderId: ride.riderId, driverId: ride.driverId,
      amountMinor: ride.finalFareMinor, currencyCode: ride.currencyCode, method: paymentInfo.method,
    });

    const amountLabel = formatMoney(ride.finalFareMinor, ride.currencyCode);
    await publishNotification('PAYMENT_SUCCESS', {
      userId: ride.riderId, userType: 'rider', rideId: ride.id,
      variables: { amount: amountLabel, method: paymentInfo.method },
    });

    if (ride.driverId) {
      await publishNotification('PAYMENT_SUCCESS', {
        userId: ride.driverId, userType: 'driver', rideId: ride.id,
        variables: { amount: amountLabel, method: paymentInfo.method },
      });
    }

    const acceptedSplits = await db.select()
      .from(rideFareSplits)
      .where(and(eq(rideFareSplits.rideId, ride.id), eq(rideFareSplits.status, 'accepted')));
    for (const split of acceptedSplits) {
      await publishNotification('PAYMENT_SUCCESS', {
        userId: split.inviteeId, userType: 'rider', rideId: ride.id,
        variables: { amount: amountLabel, method: paymentInfo.method },
      }).catch(() => {});
    }

    return updated;
  } else {
    const [updated] = await db.update(rides)
      .set({ paymentStatus: 'processing' })
      .where(eq(rides.id, ride.id)).returning();
    return { ...updated, partial: true, totalCaptured, finalFareMinor: ride.finalFareMinor };
  }
}
