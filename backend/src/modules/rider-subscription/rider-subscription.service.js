import { eq, and, desc, count, lt } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { riderSubscriptionPlans, riderSubscriptions, payments } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { addDays } from '../../utils/time.js';
import { paginate } from '../../utils/response.js';
import { getGateway, gatewayForCurrency } from '../payment/payment.service.js';
import { getApplicableTaxRules } from '../fare/tax-rules.service.js';
import { withIdempotency } from '../../utils/idempotency.js';
import { postTransaction, getOrCreateSystemAccount } from '../ledger/ledger.service.js';
import { handleDisputeEvent } from '../dispute/dispute.service.js';

// ── Plans (admin) ─────────────────────────────────────────────────────────────

export async function listPlans(onlyActive = true, countryId) {
  const conditions = [];
  if (onlyActive) conditions.push(eq(riderSubscriptionPlans.isActive, true));
  if (countryId)  conditions.push(eq(riderSubscriptionPlans.countryId, countryId));
  const where = conditions.length ? and(...conditions) : undefined;
  return db.select().from(riderSubscriptionPlans).where(where).orderBy(riderSubscriptionPlans.sortOrder);
}

export async function listPlansPaginated(page, limit, offset, countryId, isActive) {
  const conditions = [];
  if (countryId) conditions.push(eq(riderSubscriptionPlans.countryId, countryId));
  if (isActive !== undefined) conditions.push(eq(riderSubscriptionPlans.isActive, isActive));
  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(riderSubscriptionPlans).where(where);
  const rows = await db.select().from(riderSubscriptionPlans).where(where).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function createPlan(data) {
  const [plan] = await db.insert(riderSubscriptionPlans).values(data).returning();

  const gateway = gatewayForCurrency(plan.currencyCode);
  if (gateway && plan.type !== 'lifetime' && plan.durationDays) {
    const period   = plan.type === 'monthly'    ? 'monthly'
                   : plan.type === 'quarterly'  ? 'monthly'   // billed monthly x 3
                   : plan.type === 'yearly'     ? 'yearly'
                   : 'monthly'; // custom -> monthly as base
    const interval = plan.type === 'quarterly' ? 3 : 1;
    try {
      const { gatewayPlanId } = await gateway.createPlan({
        name: plan.name, priceMinor: plan.priceMinor, currencyCode: plan.currencyCode,
        period, interval, metadata: { planId: plan.id },
      });
      await db.update(riderSubscriptionPlans)
        .set({ gateway: gateway.name, gatewayPlanId })
        .where(eq(riderSubscriptionPlans.id, plan.id));
      plan.gateway = gateway.name;
      plan.gatewayPlanId = gatewayPlanId;
    } catch (err) {
      console.error(`[RiderSubscription] ${gateway.name} plan creation failed:`, err.message);
    }
  }
  return plan;
}

export async function updatePlan(id, data) {
  data.updatedAt = new Date();
  const [plan] = await db.update(riderSubscriptionPlans).set(data).where(eq(riderSubscriptionPlans.id, id)).returning();
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };
  return plan;
}

export async function setPlanActive(id, isActive, adminId) {
  const [plan] = await db.update(riderSubscriptionPlans)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(riderSubscriptionPlans.id, id)).returning();
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'RIDER_PLAN_ENABLED' : 'RIDER_PLAN_DISABLED',
    entityType: 'rider_subscription_plan', entityId: id,
  });
  return plan;
}

// ── Rider subscription flow ────────────────────────────────────────────────────

// idempotencyKey comes from the client's Idempotency-Key header (required — see
// rider-subscription.routes.js) so a retried/double-submitted initiate request returns the
// original gateway order instead of creating a second charge attempt.
export async function initiateSubscription(riderId, planId, idempotencyKey) {
  return withIdempotency('rider_subscription_initiate', idempotencyKey, riderId, async () => {
    const [plan] = await db.select().from(riderSubscriptionPlans)
      .where(and(eq(riderSubscriptionPlans.id, planId), eq(riderSubscriptionPlans.isActive, true))).limit(1);
    if (!plan) throw { statusCode: 404, message: 'Plan not found or inactive' };

    const gateway = gatewayForCurrency(plan.currencyCode);
    const totalMinor = await addPlanTax(plan.countryId, plan.priceMinor);

    if (!gateway) {
      // Dev mode — this currency's gateway has no keys configured, activate directly
      return _activateSubscription(riderId, planId, plan, totalMinor, {
        gateway: 'none', gatewayPaymentId: 'dev_payment_' + Date.now(), gatewayOrderId: null,
      });
    }

    const order = await gateway.createOrder({
      amountMinor: totalMinor,
      currencyCode: plan.currencyCode,
      metadata: { riderId, planId },
      idempotencyKey,
    });

    const [payment] = await db.insert(payments).values({
      riderSubscriptionId: null, // filled in on activation — this row tracks the pending attempt via gatewayOrderId until then
      countryId: plan.countryId,
      gateway: gateway.name,
      currencyCode: plan.currencyCode,
      amountMinor: totalMinor,
      status: 'created',
      gatewayOrderId: order.gatewayOrderId,
    }).returning();

    return {
      ...order,
      paymentAttemptId: payment.id,
      plan: { id: plan.id, name: plan.name, type: plan.type, durationDays: plan.durationDays },
    };
  });
}

export async function verifyAndActivate(riderId, planId, orderRef, paymentRef, signature) {
  const [plan] = await db.select().from(riderSubscriptionPlans).where(eq(riderSubscriptionPlans.id, planId)).limit(1);
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };

  const gateway = gatewayForCurrency(plan.currencyCode);
  if (!gateway) {
    const totalMinor = await addPlanTax(plan.countryId, plan.priceMinor);
    return _activateSubscriptionIdempotent(riderId, planId, plan, totalMinor, {
      gateway: 'none', gatewayPaymentId: paymentRef, gatewayOrderId: orderRef,
    });
  }

  const verified = await gateway.verifyPayment({ orderRef, paymentRef, signature });
  if (!verified) throw { statusCode: 400, message: 'Payment verification failed' };

  const [attempt] = await db.select().from(payments)
    .where(eq(payments.gatewayOrderId, orderRef)).limit(1);
  const totalMinor = attempt?.amountMinor ?? await addPlanTax(plan.countryId, plan.priceMinor);

  return _activateSubscriptionIdempotent(riderId, planId, plan, totalMinor, {
    gateway: gateway.name, gatewayPaymentId: paymentRef, gatewayOrderId: orderRef, paymentAttemptId: attempt?.id,
  });
}

async function addPlanTax(countryId, priceMinor) {
  const rules = await getApplicableTaxRules(countryId, 'subscription');
  const exclusiveRate = rules.filter((r) => !r.isInclusive)
    .reduce((sum, r) => sum + parseFloat(r.rate), 0);
  return priceMinor + Math.round(priceMinor * exclusiveRate);
}

// Same double-activation race as subscription.service.js — verifyAndActivate and
// handleWebhook can both fire for the same order; keying on gatewayOrderId means whichever
// arrives first wins. Dev mode (no orderRef) never races, so it skips the wrapper.
async function _activateSubscriptionIdempotent(riderId, planId, plan, amountMinor, paymentInfo) {
  if (!paymentInfo.gatewayOrderId) return _activateSubscription(riderId, planId, plan, amountMinor, paymentInfo);
  return withIdempotency('rider_subscription_activation', paymentInfo.gatewayOrderId, riderId, () =>
    _activateSubscription(riderId, planId, plan, amountMinor, paymentInfo));
}

async function _activateSubscription(riderId, planId, plan, amountMinor, paymentInfo) {
  // Expire any existing active sub
  await db.update(riderSubscriptions).set({ status: 'expired' }).where(
    and(eq(riderSubscriptions.riderId, riderId), eq(riderSubscriptions.status, 'active')),
  );

  const endDate = plan.durationDays ? addDays(new Date(), plan.durationDays) : null;

  const [sub] = await db.insert(riderSubscriptions).values({
    riderId, planId,
    status:       'active',
    endDate,
    currencyCode: plan.currencyCode,
    amountMinor,
  }).returning();

  if (paymentInfo.paymentAttemptId) {
    await db.update(payments)
      .set({
        riderSubscriptionId: sub.id, status: 'captured', updatedAt: new Date(),
        gatewayPaymentId: paymentInfo.gatewayPaymentId,
      })
      .where(eq(payments.id, paymentInfo.paymentAttemptId));
  } else {
    await db.insert(payments).values({
      riderSubscriptionId: sub.id,
      countryId: plan.countryId,
      gateway: paymentInfo.gateway,
      currencyCode: plan.currencyCode,
      amountMinor,
      status: 'captured',
      gatewayOrderId: paymentInfo.gatewayOrderId,
      gatewayPaymentId: paymentInfo.gatewayPaymentId,
    });
  }

  const clearingAccount = await getOrCreateSystemAccount(`processor_clearing:${paymentInfo.gateway}`, plan.currencyCode);
  const revenueAccount = await getOrCreateSystemAccount('platform_revenue:rider_subscriptions', plan.currencyCode);
  await postTransaction({
    businessType: 'rider_subscription_charge',
    idempotencyKey: `rider_subscription_charge:${sub.id}`,
    referenceType: 'rider_subscription',
    referenceId: sub.id,
    entries: [
      { accountId: clearingAccount.id, direction: 'debit', amountMinor, currencyCode: plan.currencyCode },
      { accountId: revenueAccount.id, direction: 'credit', amountMinor, currencyCode: plan.currencyCode },
    ],
  });

  await publishEvent(TOPICS.SUBSCRIPTION_ACTIVATED, { id: sub.id, riderId, planId, endDate, ownerType: 'rider' });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'rider', userId: riderId,
    type: 'SUBSCRIPTION_ACTIVATED',
    title: '🎉 Membership Active!',
    body:  `Your ${plan.name} plan is now active. ${endDate ? `Valid until ${endDate.toDateString()}.` : 'Lifetime access!'}`,
  });
  return sub;
}

export async function getMySubscription(riderId) {
  const [sub] = await db.select({
    subscription: riderSubscriptions,
    plan:         riderSubscriptionPlans,
  }).from(riderSubscriptions)
    .innerJoin(riderSubscriptionPlans, eq(riderSubscriptions.planId, riderSubscriptionPlans.id))
    .where(and(eq(riderSubscriptions.riderId, riderId), eq(riderSubscriptions.status, 'active')))
    .orderBy(desc(riderSubscriptions.createdAt)).limit(1);
  return sub || null;
}

export async function getSubscriptionHistory(riderId, page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(riderSubscriptions)
    .where(eq(riderSubscriptions.riderId, riderId));
  const rows = await db.select({ subscription: riderSubscriptions, plan: riderSubscriptionPlans })
    .from(riderSubscriptions)
    .innerJoin(riderSubscriptionPlans, eq(riderSubscriptions.planId, riderSubscriptionPlans.id))
    .where(eq(riderSubscriptions.riderId, riderId))
    .orderBy(desc(riderSubscriptions.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Admin — a rider's payment attempts (retries/renewals included). Only covers attempts
// already linked to a rider subscription (payments.riderSubscriptionId).
export async function getPaymentsForRider(riderId, page, limit, offset) {
  const where = eq(riderSubscriptions.riderId, riderId);
  const [{ total }] = await db.select({ total: count() }).from(payments)
    .innerJoin(riderSubscriptions, eq(payments.riderSubscriptionId, riderSubscriptions.id))
    .where(where);
  const rows = await db.select({ payment: payments, plan: riderSubscriptionPlans })
    .from(payments)
    .innerJoin(riderSubscriptions, eq(payments.riderSubscriptionId, riderSubscriptions.id))
    .innerJoin(riderSubscriptionPlans, eq(riderSubscriptions.planId, riderSubscriptionPlans.id))
    .where(where)
    .orderBy(desc(payments.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// ── Gateway webhooks ────────────────────────────────────────────────────────
// Split in two so the route can verify+parse synchronously (reject bad signatures outright)
// while the actual business logic runs asynchronously via the webhook-processing job — see
// rider-subscription.routes.js and jobs/webhook-processing.job.js.

export function parseAndVerifyWebhook(gatewayName, rawBody, signature) {
  const gateway = getGateway(gatewayName);
  if (!gateway.isConfigured) {
    console.log(`[RiderSubscription] ${gatewayName} webhook received but not configured — ignoring.`);
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

  const { riderId, planId } = event.metadata || {};
  if (!riderId || !planId) return;

  const [plan] = await db.select().from(riderSubscriptionPlans).where(eq(riderSubscriptionPlans.id, planId)).limit(1);
  if (!plan) return;

  const [attempt] = await db.select().from(payments)
    .where(eq(payments.gatewayOrderId, event.orderRef)).limit(1);
  const totalMinor = attempt?.amountMinor ?? await addPlanTax(plan.countryId, plan.priceMinor);
  await _activateSubscriptionIdempotent(riderId, planId, plan, totalMinor, {
    gateway: event.gatewayName, gatewayPaymentId: event.paymentRef, gatewayOrderId: event.orderRef,
    paymentAttemptId: attempt?.id,
  });
}

// ── Expiry checker (called by BullMQ job) ─────────────────────────────────────

export async function expireOverdueSubscriptions() {
  const expired = await db.update(riderSubscriptions).set({ status: 'expired' }).where(
    and(eq(riderSubscriptions.status, 'active'), lt(riderSubscriptions.endDate, new Date())),
  ).returning({ riderId: riderSubscriptions.riderId, id: riderSubscriptions.id });

  for (const { riderId } of expired) {
    await publishEvent(TOPICS.SUBSCRIPTION_EXPIRED, { riderId, ownerType: 'rider' });
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'rider', userId: riderId,
      type: 'SUBSCRIPTION_EXPIRED',
      title: 'Membership Expired',
      body:  'Your membership plan has expired. Renew now to keep your perks.',
    });
  }
  return { expiredCount: expired.length };
}
