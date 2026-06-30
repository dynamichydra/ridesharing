import { eq, and, desc, count, lt } from 'drizzle-orm';
import Razorpay from 'razorpay';
import { createHmac } from 'crypto';
import { db } from '../../config/db.js';
import { subscriptionPlans, subscriptions, drivers } from '../../../drizzle/schema/index.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { addDays } from '../../utils/time.js';
import { paginate } from '../../utils/response.js';
import { env } from '../../config/env.js';

const razorpay = env.RAZORPAY_KEY_ID
  ? new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET })
  : null;

// ── Plans (admin) ─────────────────────────────────────────────────────────────

export async function listPlans(onlyActive = true) {
  const where = onlyActive ? eq(subscriptionPlans.isActive, true) : undefined;
  return db.select().from(subscriptionPlans).where(where).orderBy(subscriptionPlans.sortOrder);
}

export async function listPlansPaginated(page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(subscriptionPlans);
  const rows = await db.select().from(subscriptionPlans).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function createPlan(data) {
  const [plan] = await db.insert(subscriptionPlans).values(data).returning();

  // If recurring (not lifetime), create a Razorpay plan for subscription billing
  if (razorpay && data.type !== 'lifetime' && data.durationDays) {
    const period   = data.type === 'monthly'    ? 'monthly'
                   : data.type === 'quarterly'  ? 'monthly'   // Razorpay: use monthly × 3
                   : data.type === 'yearly'     ? 'yearly'
                   : 'monthly'; // custom → monthly as base
    const interval = data.type === 'quarterly' ? 3 : 1;
    try {
      const rzPlan = await razorpay.plans.create({
        period, interval,
        item: { name: data.name, amount: Math.round(parseFloat(data.price) * 100), currency: 'INR' },
        notes: { planId: plan.id },
      });
      await db.update(subscriptionPlans)
        .set({ razorpayPlanId: rzPlan.id })
        .where(eq(subscriptionPlans.id, plan.id));
      plan.razorpayPlanId = rzPlan.id;
    } catch (err) {
      console.error('[Subscription] Razorpay plan creation failed:', err.message);
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

  if (!razorpay) {
    // Dev mode — activate directly without payment
    return _activateSubscription(driverId, planId, plan, 'dev_payment_' + Date.now(), null);
  }

  // Create Razorpay order
  const order = await razorpay.orders.create({
    amount:   Math.round(parseFloat(plan.price) * 100),
    currency: 'INR',
    notes:    { driverId, planId },
  });

  return {
    orderId:   order.id,
    amount:    plan.price,
    currency:  'INR',
    keyId:     env.RAZORPAY_KEY_ID,
    plan: { id: plan.id, name: plan.name, type: plan.type, durationDays: plan.durationDays },
  };
}

export async function verifyAndActivate(driverId, planId, razorpayOrderId, razorpayPaymentId, razorpaySignature) {
  if (env.NODE_ENV !== 'production') {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
    return _activateSubscription(driverId, planId, plan, razorpayPaymentId, razorpayOrderId);
  }

  // Verify signature
  const expected = createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  if (expected !== razorpaySignature) throw { statusCode: 400, message: 'Payment verification failed' };

  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  return _activateSubscription(driverId, planId, plan, razorpayPaymentId, razorpayOrderId);
}

async function _activateSubscription(driverId, planId, plan, paymentId, orderId) {
  // Expire any existing active sub
  await db.update(subscriptions).set({ status: 'expired' }).where(
    and(eq(subscriptions.driverId, driverId), eq(subscriptions.status, 'active')),
  );

  const endDate = plan.durationDays ? addDays(new Date(), plan.durationDays) : null;

  const [sub] = await db.insert(subscriptions).values({
    driverId, planId,
    status:    'active',
    endDate,
    paymentId,
    orderId,
    amount:    String(plan.price),
  }).returning();

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

// Razorpay webhook handler
export async function handleRazorpayWebhook(rawBody, signature) {
  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET || '')
    .update(rawBody).digest('hex');
  if (expected !== signature) throw { statusCode: 400, message: 'Invalid webhook signature' };

  const event = JSON.parse(rawBody);
  if (event.event === 'payment.captured') {
    const notes    = event.payload.payment.entity.notes;
    const driverId = notes.driverId;
    const planId   = notes.planId;
    const paymentId = event.payload.payment.entity.id;
    const orderId   = event.payload.payment.entity.order_id;

    if (driverId && planId) {
      const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
      if (plan) await _activateSubscription(driverId, planId, plan, paymentId, orderId);
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
