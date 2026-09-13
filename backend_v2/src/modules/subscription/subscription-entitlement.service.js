import { eq, and, desc, sql, or, lte, gte, isNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  subscriptions,
  subscriptionPlans,
  subscriptionPlanVersions,
  subscriptionPlanEntitlements,
  subscriptionPlanVehicleTypes,
  rides,
} from '../../../drizzle/schema/index.js';

/**
 * Subscription Entitlement Service.
 * Resolves commercial benefits and enforces entitlements for drivers.
 */

/**
 * Returns the currently active subscription for a driver at a specific timestamp.
 *
 * @param {string} driverId
 * @param {{effectiveAt?: Date}} [options={}]
 * @returns {Promise<object|null>}
 */
export async function getDriverActiveSubscription(driverId, { effectiveAt = new Date() } = {}) {
  if (!driverId) return null;

  const [sub] = await db
    .select({
      subscription: subscriptions,
      plan: subscriptionPlans,
      planVersion: subscriptionPlanVersions,
      entitlementRow: subscriptionPlanEntitlements,
    })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .leftJoin(subscriptionPlanVersions, eq(subscriptions.planVersionId, subscriptionPlanVersions.id))
    .leftJoin(
      subscriptionPlanEntitlements,
      or(
        eq(subscriptions.planVersionId, subscriptionPlanEntitlements.planVersionId),
        and(isNull(subscriptions.planVersionId), eq(subscriptions.planId, subscriptionPlanEntitlements.planId))
      )
    )
    .where(
      and(
        eq(subscriptions.driverId, driverId),
        or(eq(subscriptions.status, 'active'), eq(subscriptions.status, 'trialing')),
        lte(subscriptions.startDate, effectiveAt),
        or(isNull(subscriptions.endDate), gte(subscriptions.endDate, effectiveAt))
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  return sub || null;
}

/**
 * Resolves driver entitlement profile for ride dispatch, matching boost, and commission calculation.
 *
 * @param {string} driverId
 * @param {{vehicleTypeId?: string, serviceTypeId?: string, effectiveAt?: Date}} [options={}]
 * @returns {Promise<{
 *   isSubscriber: boolean,
 *   subscriptionId: string|null,
 *   planId: string|null,
 *   planVersionId: string|null,
 *   planVersion: number,
 *   priorityMatchingBonus: number,
 *   maxRidesPerDay: number|null,
 *   canAcceptMoreRides: boolean,
 *   commissionDiscountRate: number|null,
 *   waiveBookingFee: boolean,
 *   customBookingFeeMinor: number|null,
 *   freeInstantPayouts: boolean,
 *   isVehicleAllowed: boolean,
 *   supportLevel: string
 * }>}
 */
export async function resolveDriverEntitlements(driverId, { vehicleTypeId = null, serviceTypeId = null, effectiveAt = new Date() } = {}) {
  const defaultProfile = {
    isSubscriber: false,
    subscriptionId: null,
    planId: null,
    planVersionId: null,
    planVersion: 1,
    priorityMatchingBonus: 0,
    maxRidesPerDay: null,
    canAcceptMoreRides: true,
    commissionDiscountRate: null,
    waiveBookingFee: false,
    customBookingFeeMinor: null,
    freeInstantPayouts: false,
    isVehicleAllowed: true,
    supportLevel: 'standard',
  };

  if (!driverId) return defaultProfile;

  const activeSub = await getDriverActiveSubscription(driverId, { effectiveAt });
  if (!activeSub) return defaultProfile;

  const { subscription, plan, planVersion, entitlementRow } = activeSub;

  // 1. Resolve normalized vehicle type permissions
  let isVehicleAllowed = true;
  if (vehicleTypeId) {
    const allowedVehicleTypes = await db
      .select({ vehicleTypeId: subscriptionPlanVehicleTypes.vehicleTypeId })
      .from(subscriptionPlanVehicleTypes)
      .where(
        or(
          eq(subscriptionPlanVehicleTypes.planId, plan.id),
          subscription.planVersionId ? eq(subscriptionPlanVehicleTypes.planVersionId, subscription.planVersionId) : sql`false`
        )
      );

    if (allowedVehicleTypes.length > 0) {
      isVehicleAllowed = allowedVehicleTypes.some((v) => v.vehicleTypeId === vehicleTypeId);
    } else if (Array.isArray(plan.vehicleTypeIds) && plan.vehicleTypeIds.length > 0) {
      // Fallback to legacy JSON column
      isVehicleAllowed = plan.vehicleTypeIds.includes(vehicleTypeId);
    }
  }

  // 2. Max rides per day check
  const maxRides = entitlementRow?.maxRidesPerDay ?? planVersion?.durationDays ?? plan.maxRidesPerDay ?? null;
  let canAcceptMoreRides = true;

  if (maxRides !== null && maxRides > 0) {
    const startOfDay = new Date(effectiveAt);
    startOfDay.setHours(0, 0, 0, 0);

    const [{ count: todayRideCount }] = await db
      .select({ count: sql`count(*)` })
      .from(rides)
      .where(
        and(
          eq(rides.driverId, driverId),
          gte(rides.requestedAt, startOfDay),
          sql`${rides.status} IN ('accepted', 'arriving', 'arrived', 'started', 'completed')`
        )
      );

    if (Number(todayRideCount) >= maxRides) {
      canAcceptMoreRides = false;
    }
  }

  // 3. Dynamic entitlement extraction
  const priorityScoreBonus = entitlementRow?.priorityScoreBonus
    ? parseFloat(entitlementRow.priorityScoreBonus)
    : (plan.priorityMatching || plan.entitlements?.priorityScoreBonus ? Number(plan.entitlements?.priorityScoreBonus || 0.25) : 0);

  let commissionDiscountRate = null;
  if (entitlementRow?.commissionDiscountRate) {
    commissionDiscountRate = parseFloat(entitlementRow.commissionDiscountRate);
  } else if (plan.entitlements?.commissionRate !== undefined && plan.entitlements?.commissionRate !== null) {
    commissionDiscountRate = Number(plan.entitlements.commissionRate);
  }

  const waiveBookingFee = entitlementRow?.waiveBookingFee ?? Boolean(plan.entitlements?.waiveBookingFee);
  const customBookingFeeMinor = entitlementRow?.customBookingFeeMinor ?? (plan.entitlements?.customBookingFeeMinor != null ? Number(plan.entitlements.customBookingFeeMinor) : null);
  const freeInstantPayouts = entitlementRow?.freeInstantPayouts ?? Boolean(plan.entitlements?.freeInstantPayouts);
  const supportLevel = entitlementRow?.supportLevel ?? 'standard';

  return {
    isSubscriber: true,
    subscriptionId: subscription.id,
    planId: plan.id,
    planVersionId: subscription.planVersionId || planVersion?.id || null,
    planVersion: planVersion?.version || 1,
    priorityMatchingBonus: priorityScoreBonus,
    maxRidesPerDay: maxRides,
    canAcceptMoreRides,
    commissionDiscountRate,
    waiveBookingFee,
    customBookingFeeMinor,
    freeInstantPayouts,
    isVehicleAllowed,
    supportLevel,
  };
}
