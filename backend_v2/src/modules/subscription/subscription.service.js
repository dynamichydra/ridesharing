import { eq, and, desc, count, lt } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { subscriptionPlans, subscriptions, drivers, payments, countries } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { addDays } from '../../utils/time.js';
import { paginate } from '../../utils/response.js';
import { getGateway, gatewayForCurrency } from '../payment/payment.service.js';
import { gatewayRegistry } from '../payment/registry.js';
import { getApplicableTaxRules } from '../fare/tax-rules.service.js';
import { withIdempotency } from '../../utils/idempotency.js';
import { postTransaction, getOrCreateSystemAccount } from '../ledger/ledger.service.js';
import { handleDisputeEvent } from '../dispute/dispute.service.js';
import { publishNotification } from '../notification/notification-events.js';

// TODO: Replace with live production Razorpay and Stripe API keys in .env when going live:
// - RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET
// - STRIPE_SECRET_KEY & STRIPE_PUBLISHABLE_KEY & STRIPE_WEBHOOK_SECRET

// ── Plans (admin) ─────────────────────────────────────────────────────────────

export async function listPlans(onlyActive = true, countryId) {
  const conditions = [];
  if (onlyActive) conditions.push(eq(subscriptionPlans.isActive, true));
  if (countryId)  conditions.push(eq(subscriptionPlans.countryId, countryId));
  const where = conditions.length ? and(...conditions) : undefined;
  return db.select().from(subscriptionPlans).where(where).orderBy(subscriptionPlans.sortOrder);
}

export async function listPlansPaginated(page, limit, offset, countryId, isActive) {
  const conditions = [];
  if (countryId) conditions.push(eq(subscriptionPlans.countryId, countryId));
  if (isActive !== undefined) conditions.push(eq(subscriptionPlans.isActive, isActive));
  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(subscriptionPlans).where(where);
  const rows = await db.select().from(subscriptionPlans).where(where).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function createPlan(data) {
  const [plan] = await db.insert(subscriptionPlans).values(data).returning();

  // If recurring (not lifetime), register a matching recurring plan with that
  // currency's gateway for subscription billing.
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
      await db.update(subscriptionPlans)
        .set({ gateway: gateway.name, gatewayPlanId })
        .where(eq(subscriptionPlans.id, plan.id));
      plan.gateway = gateway.name;
      plan.gatewayPlanId = gatewayPlanId;
    } catch (err) {
      console.error(`[Subscription] ${gateway.name} plan creation failed:`, err.message);
    }
  }
  return plan;
}

export async function updatePlan(id, data) {
  data.updatedAt = new Date();
  const [plan] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };
  return plan;
}

export async function setPlanActive(id, isActive, adminId) {
  const [plan] = await db.update(subscriptionPlans)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(subscriptionPlans.id, id)).returning();
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'SUBSCRIPTION_PLAN_ENABLED' : 'SUBSCRIPTION_PLAN_DISABLED',
    entityType: 'subscription_plan', entityId: id,
  });
  return plan;
}

// ── Driver subscription flow ───────────────────────────────────────────────────

// idempotencyKey comes from the client's Idempotency-Key header (required — see
// subscription.routes.js) so a retried/double-submitted initiate request returns the
// original gateway order instead of creating a second charge attempt.
export async function initiateSubscription(driverId, planId, idempotencyKey) {
  return withIdempotency('driver_subscription_initiate', idempotencyKey, driverId, async () => {
    const [plan] = await db.select().from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.isActive, true))).limit(1);
    if (!plan) throw { statusCode: 404, message: 'Plan not found or inactive' };

    const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
    if (!driver) throw { statusCode: 404, message: 'Driver not found' };

    // Resolve country code from driver's country or plan's country
    const countryId = driver.countryId || plan.countryId;
    let countryIsoCode = 'IN';
    if (countryId) {
      const [c] = await db.select({ isoCode: countries.isoCode }).from(countries).where(eq(countries.id, countryId)).limit(1);
      if (c?.isoCode) countryIsoCode = c.isoCode;
    }

    const gateway = gatewayRegistry.getForCountry(countryIsoCode) || gatewayForCurrency(plan.currencyCode);
    const totalMinor = await addSubscriptionTax(plan.countryId, plan.priceMinor);

    if (!gateway || !gateway.isConfigured) {
      throw { statusCode: 503, message: `Payment gateway for country ${countryIsoCode} (${plan.currencyCode}) is not configured.` };
    }

    const order = await gateway.createOrder({
      amountMinor: totalMinor,
      currencyCode: plan.currencyCode,
      metadata: { driverId, planId },
      idempotencyKey,
    });

    const [payment] = await db.insert(payments).values({
      subscriptionId: null, // filled in on activation — this row tracks the pending attempt via gatewayOrderId until then
      countryId: plan.countryId,
      gateway: gateway.name,
      currencyCode: plan.currencyCode,
      amountMinor: totalMinor,
      status: 'created',
      gatewayOrderId: order.gatewayOrderId,
    }).returning();

    return {
      ...order,
      gateway: gateway.name,
      paymentAttemptId: payment.id,
      plan: { id: plan.id, name: plan.name, type: plan.type, durationDays: plan.durationDays },
    };
  });
}

export async function verifyAndActivate(driverId, planId, orderRef, paymentRef, signature) {
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };

  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  const countryId = driver?.countryId || plan.countryId;
  let countryIsoCode = 'IN';
  if (countryId) {
    const [c] = await db.select({ isoCode: countries.isoCode }).from(countries).where(eq(countries.id, countryId)).limit(1);
    if (c?.isoCode) countryIsoCode = c.isoCode;
  }

  const gateway = gatewayRegistry.getForCountry(countryIsoCode) || gatewayForCurrency(plan.currencyCode);
  if (!gateway || !gateway.isConfigured) {
    throw { statusCode: 503, message: `Payment gateway for country ${countryIsoCode} (${plan.currencyCode}) is not configured.` };
  }

  const verified = await gateway.verifyPayment({ orderRef, paymentRef, signature });
  if (!verified) throw { statusCode: 400, message: 'Payment verification failed' };

  const [attempt] = await db.select().from(payments)
    .where(eq(payments.gatewayOrderId, orderRef)).limit(1);
  const totalMinor = attempt?.amountMinor ?? await addSubscriptionTax(plan.countryId, plan.priceMinor);

  return _activateSubscriptionIdempotent(driverId, planId, plan, totalMinor, {
    gateway: gateway.name, gatewayPaymentId: paymentRef, gatewayOrderId: orderRef, paymentAttemptId: attempt?.id,
  });
}

async function addSubscriptionTax(countryId, priceMinor) {
  const rules = await getApplicableTaxRules(countryId, 'subscription');
  const exclusiveRate = rules.filter((r) => !r.isInclusive)
    .reduce((sum, r) => sum + parseFloat(r.rate), 0);
  return priceMinor + Math.round(priceMinor * exclusiveRate);
}

// verifyAndActivate (client-driven) and handleWebhook can both fire for the same order —
// without this, both would race into _activateSubscription and double-activate the
// subscription. Keying on gatewayOrderId means whichever path arrives first wins and the
// second is a no-op replay. Dev mode (no real gateway, no orderRef) never races — it's only
// ever called once, directly from initiateSubscription — so it skips the wrapper entirely.
async function _activateSubscriptionIdempotent(driverId, planId, plan, amountMinor, paymentInfo) {
  if (!paymentInfo.gatewayOrderId) return _activateSubscription(driverId, planId, plan, amountMinor, paymentInfo);
  return withIdempotency('subscription_activation', paymentInfo.gatewayOrderId, driverId, () =>
    _activateSubscription(driverId, planId, plan, amountMinor, paymentInfo));
}

async function _activateSubscription(driverId, planId, plan, amountMinor, paymentInfo) {
  // Expire any existing active sub
  await db.update(subscriptions).set({ status: 'expired' }).where(
    and(eq(subscriptions.driverId, driverId), eq(subscriptions.status, 'active')),
  );

  const endDate = plan.durationDays ? addDays(new Date(), plan.durationDays) : null;

  const [sub] = await db.insert(subscriptions).values({
    driverId, planId,
    status:       'active',
    endDate,
    currencyCode: plan.currencyCode,
    amountMinor,
  }).returning();

  if (paymentInfo.paymentAttemptId) {
    await db.update(payments)
      .set({
        subscriptionId: sub.id, status: 'captured', updatedAt: new Date(),
        gatewayPaymentId: paymentInfo.gatewayPaymentId,
      })
      .where(eq(payments.id, paymentInfo.paymentAttemptId));
  } else {
    await db.insert(payments).values({
      subscriptionId: sub.id,
      countryId: plan.countryId,
      gateway: paymentInfo.gateway,
      currencyCode: plan.currencyCode,
      amountMinor,
      status: 'captured',
      gatewayOrderId: paymentInfo.gatewayOrderId,
      gatewayPaymentId: paymentInfo.gatewayPaymentId,
    });
  }

  await db.update(drivers).set({ subscriptionStatus: 'active' }).where(eq(drivers.id, driverId));

  const clearingAccount = await getOrCreateSystemAccount(`processor_clearing:${paymentInfo.gateway}`, plan.currencyCode);
  const revenueAccount = await getOrCreateSystemAccount('platform_revenue:driver_subscriptions', plan.currencyCode);
  await postTransaction({
    businessType: 'driver_subscription_charge',
    idempotencyKey: `driver_subscription_charge:${sub.id}`,
    referenceType: 'subscription',
    referenceId: sub.id,
    entries: [
      { accountId: clearingAccount.id, direction: 'debit', amountMinor, currencyCode: plan.currencyCode },
      { accountId: revenueAccount.id, direction: 'credit', amountMinor, currencyCode: plan.currencyCode },
    ],
  });

  try {
    await publishEvent(TOPICS.SUBSCRIPTION_ACTIVATED, { id: sub.id, driverId, planId, endDate });
    await publishNotification('SUBSCRIPTION_ACTIVATED', {
      userId: driverId, userType: 'driver',
      variables: { planName: plan.name, endDate: endDate ? endDate.toDateString() : 'Lifetime access' },
    });
  } catch (err) {
    console.warn('[Subscription] Non-fatal notification/event publishing warning:', err?.message || err);
  }
  return sub;
}

export async function getMySubscription(driverId) {
  const [sub] = await db.select({
    subscription: subscriptions,
    plan:         subscriptionPlans,
  }).from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(and(eq(subscriptions.driverId, driverId), eq(subscriptions.status, 'active')))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return sub || null;
}

export async function getSubscriptionHistory(driverId, page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(subscriptions)
    .where(eq(subscriptions.driverId, driverId));
  const rows = await db.select({ subscription: subscriptions, plan: subscriptionPlans })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.driverId, driverId))
    .orderBy(desc(subscriptions.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// Admin — a driver's payment attempts (retries/renewals included). Only covers attempts
// already linked to a subscription (payments.subscriptionId); an attempt that failed before
// ever activating a subscription has no driverId anywhere on the payments row and can't be
// traced back to a driver without a schema change.
export async function getPaymentsForDriver(driverId, page, limit, offset) {
  const where = eq(subscriptions.driverId, driverId);
  const [{ total }] = await db.select({ total: count() }).from(payments)
    .innerJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
    .where(where);
  const rows = await db.select({ payment: payments, plan: subscriptionPlans })
    .from(payments)
    .innerJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(where)
    .orderBy(desc(payments.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

// ── Gateway webhooks ────────────────────────────────────────────────────────
// Split in two so the route can verify+parse synchronously (reject bad signatures outright)
// while the actual business logic runs asynchronously via the webhook-processing job — see
// subscription.routes.js and jobs/webhook-processing.job.js.

export function parseAndVerifyWebhook(gatewayName, rawBody, signature) {
  const gateway = getGateway(gatewayName);
  if (!gateway.isConfigured) {
    console.log(`[Subscription] ${gatewayName} webhook received but not configured — ignoring.`);
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

  const { driverId, planId } = event.metadata || {};
  if (!driverId || !planId) return;

  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  if (!plan) return;

  const [attempt] = await db.select().from(payments)
    .where(eq(payments.gatewayOrderId, event.orderRef)).limit(1);
  const totalMinor = attempt?.amountMinor ?? await addSubscriptionTax(plan.countryId, plan.priceMinor);
  await _activateSubscriptionIdempotent(driverId, planId, plan, totalMinor, {
    gateway: event.gatewayName, gatewayPaymentId: event.paymentRef, gatewayOrderId: event.orderRef,
    paymentAttemptId: attempt?.id,
  });
}

// ── Expiry checker (called by BullMQ job) ─────────────────────────────────────

export async function expireOverdueSubscriptions() {
  const expired = await db.update(subscriptions).set({ status: 'expired' }).where(
    and(eq(subscriptions.status, 'active'), lt(subscriptions.endDate, new Date())),
  ).returning({ driverId: subscriptions.driverId, id: subscriptions.id });

  for (const { driverId } of expired) {
    await db.update(drivers)
      .set({ subscriptionStatus: 'expired', isOnline: false })
      .where(eq(drivers.id, driverId));

    await publishEvent(TOPICS.SUBSCRIPTION_EXPIRED, { driverId });
    await publishEvent(TOPICS.NOTIF_PUSH, {
      userType: 'driver', userId: driverId,
      type: 'SUBSCRIPTION_EXPIRED',
      title: 'Subscription Expired',
      body:  'Your subscription has expired. Renew now to continue accepting rides.',
    });
  }
  return { expiredCount: expired.length };
}
