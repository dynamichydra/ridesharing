import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  subscriptions,
  subscriptionPlans,
  subscriptionPlanVersions,
  subscriptionEvents,
  drivers,
  payments,
} from '../../../drizzle/schema/index.js';
import { addDays } from '../../utils/time.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

/**
 * Valid state transition matrix for the subscription state machine.
 */
const VALID_TRANSITIONS = {
  pending: ['active', 'trialing', 'cancelled', 'payment_failed'],
  trialing: ['active', 'cancelled', 'expired', 'payment_failed', 'past_due'],
  active: ['paused', 'cancelled', 'expired', 'past_due', 'payment_failed'],
  paused: ['active', 'cancelled', 'expired'],
  past_due: ['active', 'cancelled', 'expired', 'payment_failed'],
  payment_failed: ['active', 'pending', 'cancelled', 'expired'],
  cancelled: ['pending', 'active'], // re-subscription or manual reactivation
  expired: ['pending', 'active'],   // renewal path
  inactive: ['active', 'pending'],
};

/**
 * Transitions a subscription to a new status, enforcing state machine rules
 * and persisting an immutable event log.
 *
 * @param {object} params
 * @param {string} params.subscriptionId
 * @param {string} params.toStatus
 * @param {string} [params.actorType='system'] - 'driver' | 'admin' | 'system' | 'webhook'
 * @param {string} [params.actorId=null]
 * @param {string} [params.reason=null]
 * @param {object} [params.metadata={}]
 * @param {object} [params.updates={}] - additional fields to update on the subscriptions row
 * @returns {Promise<object>} updated subscription
 */
export async function transitionSubscription({
  subscriptionId,
  toStatus,
  actorType = 'system',
  actorId = null,
  reason = null,
  metadata = {},
  updates = {},
}) {
  const [current] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!current) {
    throw { statusCode: 404, message: `Subscription ${subscriptionId} not found` };
  }

  const fromStatus = current.status;

  // Validate state transition
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  if (!allowed.includes(toStatus) && fromStatus !== toStatus) {
    throw {
      statusCode: 422,
      message: `Invalid subscription state transition from '${fromStatus}' to '${toStatus}'`,
    };
  }

  const now = new Date();
  const updatePayload = {
    status: toStatus,
    updatedAt: now,
    ...updates,
  };

  if (toStatus === 'cancelled' && !updatePayload.cancelledAt) {
    updatePayload.cancelledAt = now;
    if (reason && !updatePayload.cancelNote) {
      updatePayload.cancelNote = reason;
    }
  }

  if (toStatus === 'paused' && !updatePayload.pausedAt) {
    updatePayload.pausedAt = now;
  }

  if (toStatus === 'active' && fromStatus === 'paused') {
    updatePayload.resumedAt = now;
  }

  const [updated] = await db
    .update(subscriptions)
    .set(updatePayload)
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  // Record immutable lifecycle event
  await db.insert(subscriptionEvents).values({
    subscriptionId,
    eventType: mapStatusToEventType(toStatus, fromStatus),
    fromStatus,
    toStatus,
    actorType,
    actorId,
    reason,
    metadata: { ...metadata, timestamp: now.toISOString() },
  });

  // Sync driver subscription status
  const driverSubStatus = toStatus === 'active' || toStatus === 'trialing' ? 'active' : toStatus;
  await db
    .update(drivers)
    .set({ subscriptionStatus: driverSubStatus })
    .where(eq(drivers.id, current.driverId));

  return updated;
}

/**
 * Maps a target status to a standard event type.
 */
function mapStatusToEventType(toStatus, fromStatus) {
  if (toStatus === 'active' && fromStatus === 'pending') return 'activated';
  if (toStatus === 'active' && fromStatus === 'paused') return 'resumed';
  if (toStatus === 'active' && (fromStatus === 'active' || fromStatus === 'expired')) return 'renewed';
  if (toStatus === 'trialing') return 'trial_started';
  if (toStatus === 'paused') return 'paused';
  if (toStatus === 'cancelled') return 'cancelled';
  if (toStatus === 'expired') return 'expired';
  if (toStatus === 'payment_failed') return 'payment_failed';
  return 'created';
}

/**
 * Pauses an active subscription, calculating and preserving remaining active days.
 */
export async function pauseSubscription(subscriptionId, { actorType = 'driver', actorId = null, reason = null } = {}) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub) throw { statusCode: 404, message: 'Subscription not found' };
  if (sub.status !== 'active') throw { statusCode: 422, message: 'Only active subscriptions can be paused' };

  const now = new Date();
  let remainingMs = 0;
  if (sub.endDate) {
    remainingMs = Math.max(0, new Date(sub.endDate).getTime() - now.getTime());
  }

  return transitionSubscription({
    subscriptionId,
    toStatus: 'paused',
    actorType,
    actorId,
    reason: reason || 'Subscription paused by user/admin',
    metadata: { remainingMs, pausedAt: now.toISOString() },
    updates: { pausedAt: now },
  });
}

/**
 * Resumes a paused subscription, extending the end date by the frozen remaining duration.
 */
export async function resumeSubscription(subscriptionId, { actorType = 'driver', actorId = null } = {}) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub) throw { statusCode: 404, message: 'Subscription not found' };
  if (sub.status !== 'paused') throw { statusCode: 422, message: 'Only paused subscriptions can be resumed' };

  const now = new Date();
  let newEndDate = sub.endDate;

  if (sub.pausedAt && sub.endDate) {
    const remainingMs = Math.max(0, new Date(sub.endDate).getTime() - new Date(sub.pausedAt).getTime());
    newEndDate = new Date(now.getTime() + remainingMs);
  }

  return transitionSubscription({
    subscriptionId,
    toStatus: 'active',
    actorType,
    actorId,
    reason: 'Subscription resumed',
    metadata: { resumedAt: now.toISOString(), previousEndDate: sub.endDate, newEndDate },
    updates: { resumedAt: now, endDate: newEndDate },
  });
}

/**
 * Cancels a subscription immediately or at period end.
 */
export async function cancelSubscription(subscriptionId, { actorType = 'driver', actorId = null, reason = null, immediate = true } = {}) {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!sub) throw { statusCode: 404, message: 'Subscription not found' };

  if (immediate) {
    return transitionSubscription({
      subscriptionId,
      toStatus: 'cancelled',
      actorType,
      actorId,
      reason: reason || 'Subscription cancelled',
      updates: { cancelledAt: new Date(), cancelNote: reason },
    });
  }

  // Cancel at period end: disable auto-renew without changing active status immediately
  const [updated] = await db
    .update(subscriptions)
    .set({ autoRenew: false, cancelNote: reason, updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  await db.insert(subscriptionEvents).values({
    subscriptionId,
    eventType: 'cancelled',
    fromStatus: sub.status,
    toStatus: sub.status,
    actorType,
    actorId,
    reason: reason || 'Auto-renew disabled (cancel at period end)',
    metadata: { cancelAtPeriodEnd: true, endDate: sub.endDate },
  });

  return updated;
}

/**
 * Calculates proration credit for plan upgrades / downgrades.
 *
 * @param {object} currentSub
 * @param {object} currentVersion
 * @param {object} newVersion
 * @returns {{ creditMinor: number, netChargeMinor: number, remainingDays: number, totalDays: number }}
 */
export function calculateProration(currentSub, currentVersion, newVersion) {
  if (!currentSub.endDate || !currentVersion || currentSub.status !== 'active') {
    return {
      creditMinor: 0,
      netChargeMinor: Number(newVersion.priceMinor),
      remainingDays: 0,
      totalDays: Number(newVersion.durationDays || 30),
    };
  }

  const now = new Date();
  const end = new Date(currentSub.endDate);
  const start = new Date(currentSub.startDate || currentSub.createdAt);

  const totalDurationMs = Math.max(1000, end.getTime() - start.getTime());
  const remainingMs = Math.max(0, end.getTime() - now.getTime());

  const unusedRatio = remainingMs / totalDurationMs;
  const currentPrice = Number(currentSub.amountMinor || currentVersion.priceMinor || 0);
  const creditMinor = Math.round(currentPrice * unusedRatio);

  const newPrice = Number(newVersion.priceMinor);
  const netChargeMinor = Math.max(0, newPrice - creditMinor);

  return {
    creditMinor,
    netChargeMinor,
    remainingDays: Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
    totalDays: Number(newVersion.durationDays || 30),
  };
}
