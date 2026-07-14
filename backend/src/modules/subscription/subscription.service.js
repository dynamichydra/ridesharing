import { eq, and, desc, count, lt } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { subscriptionPlans, subscriptions, drivers, payments } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { addDays } from '../../utils/time.js';
import { paginate } from '../../utils/response.js';
import { getGateway, gatewayForCurrency } from '../payment/payment.service.js';
import { getApplicableTaxRules } from '../fare/tax-rules.service.js';

// ── Plans (admin) ─────────────────────────────────────────────────────────────

export async function listPlans(onlyActive = true, countryId) {
  const conditions = [];
  if (onlyActive) conditions.push(eq(subscriptionPlans.isActive, true));
  if (countryId)  conditions.push(eq(subscriptionPlans.countryId, countryId));
  const where = conditions.length ? and(...conditions) : undefined;
  return db.select().from(subscriptionPlans).where(where).orderBy(subscriptionPlans.sortOrder);
}

export async function listPlansPaginated(page, limit, offset, countryId) {
  const where = countryId ? eq(subscriptionPlans.countryId, countryId) : undefined;
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

export async function deletePlan(id) {
  const [plan] = await db.update(subscriptionPlans)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(subscriptionPlans.id, id)).returning();
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };
  return { deleted: true };
}

// ── Driver subscription flow ───────────────────────────────────────────────────

export async function initiateSubscription(driverId, planId) {
  const [plan] = await db.select().from(subscriptionPlans)
    .where(and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.isActive, true))).limit(1);
  if (!plan) throw { statusCode: 404, message: 'Plan not found or inactive' };

  const gateway = gatewayForCurrency(plan.currencyCode);
  const totalMinor = await addSubscriptionTax(plan.countryId, plan.priceMinor);

  if (!gateway) {
    // Dev mode — this currency's gateway has no keys configured, activate directly
    return _activateSubscription(driverId, planId, plan, totalMinor, {
      gateway: 'none', gatewayPaymentId: 'dev_payment_' + Date.now(), gatewayOrderId: null,
    });
  }

  const order = await gateway.createOrder({
    amountMinor: totalMinor,
    currencyCode: plan.currencyCode,
    metadata: { driverId, planId },
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
    paymentAttemptId: payment.id,
    plan: { id: plan.id, name: plan.name, type: plan.type, durationDays: plan.durationDays },
  };
}

export async function verifyAndActivate(driverId, planId, orderRef, paymentRef, signature) {
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };

  const gateway = gatewayForCurrency(plan.currencyCode);
  if (!gateway) {
    const totalMinor = await addSubscriptionTax(plan.countryId, plan.priceMinor);
    return _activateSubscription(driverId, planId, plan, totalMinor, {
      gateway: 'none', gatewayPaymentId: paymentRef, gatewayOrderId: orderRef,
    });
  }

  const verified = await gateway.verifyPayment({ orderRef, paymentRef, signature });
  if (!verified) throw { statusCode: 400, message: 'Payment verification failed' };

  const [attempt] = await db.select().from(payments)
    .where(eq(payments.gatewayOrderId, orderRef)).limit(1);
  const totalMinor = attempt?.amountMinor ?? await addSubscriptionTax(plan.countryId, plan.priceMinor);

  return _activateSubscription(driverId, planId, plan, totalMinor, {
    gateway: gateway.name, gatewayPaymentId: paymentRef, gatewayOrderId: orderRef, paymentAttemptId: attempt?.id,
  });
}

async function addSubscriptionTax(countryId, priceMinor) {
  const rules = await getApplicableTaxRules(countryId, 'subscription');
  const exclusiveRate = rules.filter((r) => !r.isInclusive)
    .reduce((sum, r) => sum + parseFloat(r.rate), 0);
  return priceMinor + Math.round(priceMinor * exclusiveRate);
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

  await publishEvent(TOPICS.SUBSCRIPTION_ACTIVATED, { id: sub.id, driverId, planId, endDate });
  await publishEvent(TOPICS.NOTIF_PUSH, {
    userType: 'driver', userId: driverId,
    type: 'SUBSCRIPTION_ACTIVATED',
    title: '🎉 Subscription Active!',
    body:  `Your ${plan.name} plan is now active. ${endDate ? `Valid until ${endDate.toDateString()}.` : 'Lifetime access!'}`,
  });
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

// ── Gateway webhooks ────────────────────────────────────────────────────────

export async function handleWebhook(gatewayName, rawBody, signature) {
  const gateway = getGateway(gatewayName);
  if (!gateway.isConfigured) {
    console.log(`[Subscription] ${gatewayName} webhook received but not configured — ignoring.`);
    return { received: true };
  }
  if (!gateway.verifyWebhookSignature(rawBody, signature)) {
    throw { statusCode: 400, message: 'Invalid webhook signature' };
  }

  const event = gateway.parseWebhookEvent(rawBody, signature);
  if (event) {
    const { driverId, planId } = event.metadata || {};
    if (driverId && planId) {
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
      if (plan) {
        const [attempt] = await db.select().from(payments)
          .where(eq(payments.gatewayOrderId, event.orderRef)).limit(1);
        const totalMinor = attempt?.amountMinor ?? await addSubscriptionTax(plan.countryId, plan.priceMinor);
        await _activateSubscription(driverId, planId, plan, totalMinor, {
          gateway: gateway.name, gatewayPaymentId: event.paymentRef, gatewayOrderId: event.orderRef,
          paymentAttemptId: attempt?.id,
        });
      }
    }
  }
  return { received: true };
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
