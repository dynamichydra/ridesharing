import { eq, and, desc, count, lt, inArray, sql, isNull } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  subscriptionPlans,
  subscriptionPlanVersions,
  subscriptionPlanVehicleTypes,
  subscriptionPlanEntitlements,
  subscriptions,
  subscriptionEvents,
  drivers,
  payments,
  countries,
  planGroupPricing,
  driverGroups,
} from '../../../drizzle/schema/index.js';
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
import { getDriverActiveGroupIds } from '../driver-group/driver-group.service.js';
import { logCommercialAudit } from '../admin/commercial-audit.service.js';
import { transitionSubscription, pauseSubscription, resumeSubscription, cancelSubscription } from './subscription-lifecycle.service.js';
import { resolveDriverEntitlements } from './subscription-entitlement.service.js';

// Re-export lifecycle and entitlement operations for clean service boundary
export { pauseSubscription, resumeSubscription, cancelSubscription, resolveDriverEntitlements };

// ── Plans (admin & driver) ───────────────────────────────────────────────────

export async function resolvePlanPricingForDriver(plan, driverId) {
  const driverGroupIds = driverId ? await getDriverActiveGroupIds(driverId) : [];

  // Check group exclusivity
  if (Array.isArray(plan.allowedGroupIds) && plan.allowedGroupIds.length > 0) {
    const hasAccess = plan.allowedGroupIds.some((gid) => driverGroupIds.includes(gid));
    if (!hasAccess) {
      return null; // Plan not accessible to this driver
    }
  }

  // Check group pricing overrides
  if (driverGroupIds.length > 0) {
    const now = new Date();
    const pricingRules = await db.select({
      id: planGroupPricing.id,
      groupId: planGroupPricing.groupId,
      groupName: driverGroups.name,
      specialPriceMinor: planGroupPricing.specialPriceMinor,
      discountPercent: planGroupPricing.discountPercent,
    })
      .from(planGroupPricing)
      .innerJoin(driverGroups, eq(planGroupPricing.groupId, driverGroups.id))
      .where(
        and(
          eq(planGroupPricing.planId, plan.id),
          eq(planGroupPricing.isActive, true),
          inArray(planGroupPricing.groupId, driverGroupIds),
          sql`(${planGroupPricing.startDate} IS NULL OR ${planGroupPricing.startDate} <= ${now})`,
          sql`(${planGroupPricing.endDate} IS NULL OR ${planGroupPricing.endDate} >= ${now})`
        )
      );

    if (pricingRules.length > 0) {
      let bestRule = null;
      let lowestPrice = plan.priceMinor;

      for (const rule of pricingRules) {
        let price = plan.priceMinor;
        if (rule.specialPriceMinor !== null && rule.specialPriceMinor !== undefined) {
          price = rule.specialPriceMinor;
        } else if (rule.discountPercent !== null && rule.discountPercent !== undefined) {
          price = Math.round(plan.priceMinor * (1 - rule.discountPercent / 100));
        }

        if (price < lowestPrice) {
          lowestPrice = price;
          bestRule = rule;
        }
      }

      if (bestRule) {
        return {
          ...plan,
          originalPriceMinor: plan.priceMinor,
          priceMinor: lowestPrice,
          specialOffer: {
            groupId: bestRule.groupId,
            groupName: bestRule.groupName,
            specialPriceMinor: bestRule.specialPriceMinor,
            discountPercent: bestRule.discountPercent,
            discountAmountMinor: plan.priceMinor - lowestPrice,
          },
        };
      }
    }
  }

  return {
    ...plan,
    originalPriceMinor: plan.priceMinor,
    specialOffer: null,
  };
}

export async function listPlans(onlyActive = true, countryId, driverId = null) {
  const conditions = [];
  if (onlyActive) conditions.push(eq(subscriptionPlans.isActive, true));
  if (countryId)  conditions.push(eq(subscriptionPlans.countryId, countryId));
  const where = conditions.length ? and(...conditions) : undefined;
  const rawPlans = await db.select().from(subscriptionPlans).where(where).orderBy(subscriptionPlans.sortOrder);

  if (!driverId) {
    return rawPlans
      .filter((p) => !Array.isArray(p.allowedGroupIds) || p.allowedGroupIds.length === 0)
      .map((p) => ({ ...p, originalPriceMinor: p.priceMinor, specialOffer: null }));
  }

  const resolved = [];
  for (const p of rawPlans) {
    const r = await resolvePlanPricingForDriver(p, driverId);
    if (r !== null) resolved.push(r);
  }
  return resolved;
}

export async function listPlansPaginated(page, limit, offset, countryId, isActive) {
  const conditions = [];
  if (countryId) conditions.push(eq(subscriptionPlans.countryId, countryId));
  if (isActive !== undefined) conditions.push(eq(subscriptionPlans.isActive, isActive));
  const where = conditions.length ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(subscriptionPlans).where(where);
  const rows = await db.select().from(subscriptionPlans).where(where).orderBy(subscriptionPlans.sortOrder).limit(limit).offset(offset);

  const planIds = rows.map((r) => r.id);
  if (planIds.length > 0) {
    const allVersions = await db
      .select()
      .from(subscriptionPlanVersions)
      .where(inArray(subscriptionPlanVersions.planId, planIds))
      .orderBy(desc(subscriptionPlanVersions.version));

    const versionsByPlanId = {};
    for (const v of allVersions) {
      if (!versionsByPlanId[v.planId]) versionsByPlanId[v.planId] = [];
      versionsByPlanId[v.planId].push(v);
    }

    for (const r of rows) {
      const pVersions = versionsByPlanId[r.id] || [];
      r.versions = pVersions;
      r.versionCount = pVersions.length;
      r.version = pVersions[0]?.version || r.version || 1;
    }
  }

  return { rows, pagination: paginate(page, limit, total) };
}

export async function createPlan(data, adminId = null) {
  const [plan] = await db.insert(subscriptionPlans).values(data).returning();

  // 1. Create normalized Plan Version 1
  const [version] = await db.insert(subscriptionPlanVersions).values({
    planId: plan.id,
    version: 1,
    name: plan.name,
    type: plan.type,
    currencyCode: plan.currencyCode,
    priceMinor: plan.priceMinor,
    durationDays: plan.durationDays,
    trialDays: plan.trialDays || 0,
    effectiveFrom: new Date(),
    isActive: plan.isActive,
    gateway: plan.gateway,
    gatewayPlanId: plan.gatewayPlanId,
    changeSummary: 'Initial plan version created',
    createdByAdminId: adminId,
  }).returning();

  await db.update(subscriptionPlans)
    .set({ currentVersionId: version.id })
    .where(eq(subscriptionPlans.id, plan.id));

  // 2. Populate normalized vehicle types if provided
  if (Array.isArray(data.vehicleTypeIds) && data.vehicleTypeIds.length > 0) {
    await db.insert(subscriptionPlanVehicleTypes).values(
      data.vehicleTypeIds.map((vId) => ({
        planId: plan.id,
        planVersionId: version.id,
        vehicleTypeId: vId,
      }))
    ).onConflictDoNothing();
  }

  // 3. Populate normalized entitlements if provided
  if (data.entitlements && typeof data.entitlements === 'object') {
    await db.insert(subscriptionPlanEntitlements).values({
      planId: plan.id,
      planVersionId: version.id,
      priorityMatchingBonus: data.entitlements.priorityScoreBonus ? String(data.entitlements.priorityScoreBonus) : '0.00',
      maxRidesPerDay: data.maxRidesPerDay || null,
      commissionDiscountRate: data.entitlements.commissionRate != null ? String(data.entitlements.commissionRate) : null,
      waiveBookingFee: Boolean(data.entitlements.waiveBookingFee),
      customBookingFeeMinor: data.entitlements.customBookingFeeMinor != null ? Number(data.entitlements.customBookingFeeMinor) : null,
      freeInstantPayouts: Boolean(data.entitlements.freeInstantPayouts),
      supportLevel: data.entitlements.supportLevel || 'standard',
      customEntitlements: data.entitlements,
    }).returning();
  }

  // Gateway integration
  const gateway = gatewayForCurrency(plan.currencyCode);
  if (gateway && plan.type !== 'lifetime' && plan.durationDays) {
    const period = plan.type === 'monthly' ? 'monthly'
                 : plan.type === 'quarterly' ? 'monthly'
                 : plan.type === 'yearly' ? 'yearly' : 'monthly';
    const interval = plan.type === 'quarterly' ? 3 : 1;
    try {
      const { gatewayPlanId } = await gateway.createPlan({
        name: plan.name, priceMinor: plan.priceMinor, currencyCode: plan.currencyCode,
        period, interval, metadata: { planId: plan.id },
      });
      await db.update(subscriptionPlans)
        .set({ gateway: gateway.name, gatewayPlanId })
        .where(eq(subscriptionPlans.id, plan.id));
      await db.update(subscriptionPlanVersions)
        .set({ gateway: gateway.name, gatewayPlanId })
        .where(eq(subscriptionPlanVersions.id, version.id));
      plan.gateway = gateway.name;
      plan.gatewayPlanId = gatewayPlanId;
    } catch (err) {
      console.error(`[Subscription] ${gateway.name} plan creation failed:`, err.message);
    }
  }

  await logCommercialAudit({
    actorId: adminId,
    action: 'create',
    entityType: 'subscription_plan',
    entityId: plan.id,
    newValue: plan,
    reason: 'New subscription plan created',
  });

  return plan;
}

export async function createPlanVersion(planId, newVersionData, adminId = null, reason = 'Price or terms update') {
  const [currentPlan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  if (!currentPlan) throw { statusCode: 404, message: 'Plan not found' };

  const [latestVersion] = await db.select()
    .from(subscriptionPlanVersions)
    .where(eq(subscriptionPlanVersions.planId, planId))
    .orderBy(desc(subscriptionPlanVersions.version))
    .limit(1);

  const newVersionNumber = (latestVersion?.version || 1) + 1;
  const now = new Date();

  // Close previous version effectiveTo
  if (latestVersion && !latestVersion.effectiveTo) {
    await db.update(subscriptionPlanVersions)
      .set({ effectiveTo: now, updatedAt: now })
      .where(eq(subscriptionPlanVersions.id, latestVersion.id));
  }

  // Insert new version
  const [createdVersion] = await db.insert(subscriptionPlanVersions).values({
    planId,
    version: newVersionNumber,
    name: newVersionData.name || currentPlan.name,
    type: newVersionData.type || currentPlan.type,
    currencyCode: newVersionData.currencyCode || currentPlan.currencyCode,
    priceMinor: newVersionData.priceMinor !== undefined ? newVersionData.priceMinor : currentPlan.priceMinor,
    durationDays: newVersionData.durationDays !== undefined ? newVersionData.durationDays : currentPlan.durationDays,
    trialDays: newVersionData.trialDays !== undefined ? newVersionData.trialDays : currentPlan.trialDays,
    effectiveFrom: newVersionData.effectiveFrom ? new Date(newVersionData.effectiveFrom) : now,
    effectiveTo: newVersionData.effectiveTo ? new Date(newVersionData.effectiveTo) : null,
    isActive: newVersionData.isActive !== undefined ? newVersionData.isActive : true,
    gateway: newVersionData.gateway || currentPlan.gateway,
    gatewayPlanId: newVersionData.gatewayPlanId || currentPlan.gatewayPlanId,
    changeSummary: reason,
    createdByAdminId: adminId,
  }).returning();

  // Update master plan pointer
  const [updatedPlan] = await db.update(subscriptionPlans).set({
    ...newVersionData,
    currentVersionId: createdVersion.id,
    updatedAt: now,
  }).where(eq(subscriptionPlans.id, planId)).returning();

  await logCommercialAudit({
    actorId: adminId,
    action: 'version_created',
    entityType: 'subscription_plan_version',
    entityId: createdVersion.id,
    oldValue: latestVersion,
    newValue: createdVersion,
    reason,
  });

  return updatedPlan;
}

export async function updatePlan(id, data, adminId = null) {
  const [currentPlan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  if (!currentPlan) throw { statusCode: 404, message: 'Plan not found' };

  // If price or duration changed, create an immutable version rather than mutating historical terms
  const hasCommercialChanges = (
    (data.priceMinor !== undefined && data.priceMinor !== currentPlan.priceMinor) ||
    (data.durationDays !== undefined && data.durationDays !== currentPlan.durationDays) ||
    (data.trialDays !== undefined && data.trialDays !== currentPlan.trialDays)
  );

  if (hasCommercialChanges) {
    return createPlanVersion(id, data, adminId, 'Commercial price or terms update');
  }

  data.updatedAt = new Date();
  const [plan] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();

  await logCommercialAudit({
    actorId: adminId,
    action: 'update',
    entityType: 'subscription_plan',
    entityId: id,
    oldValue: currentPlan,
    newValue: plan,
  });

  return plan;
}

export async function setPlanActive(id, isActive, adminId) {
  const [plan] = await db.update(subscriptionPlans)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(subscriptionPlans.id, id)).returning();
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };

  await logCommercialAudit({
    actorId: adminId,
    action: isActive ? 'activate' : 'deactivate',
    entityType: 'subscription_plan',
    entityId: id,
    newValue: { isActive },
  });

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'SUBSCRIPTION_PLAN_ENABLED' : 'SUBSCRIPTION_PLAN_DISABLED',
    entityType: 'subscription_plan', entityId: id,
  });
  return plan;
}

export async function setPlanGroupPricing(planId, data) {
  const { groupId, specialPriceMinor, discountPercent, startDate, endDate, isActive = true } = data;
  if (!groupId) throw { statusCode: 400, message: 'groupId is required' };
  if (specialPriceMinor == null && discountPercent == null) {
    throw { statusCode: 400, message: 'Either specialPriceMinor or discountPercent must be provided' };
  }

  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };

  const [group] = await db.select().from(driverGroups).where(eq(driverGroups.id, groupId)).limit(1);
  if (!group) throw { statusCode: 404, message: 'Driver group not found' };

  const [existing] = await db.select().from(planGroupPricing)
    .where(and(eq(planGroupPricing.planId, planId), eq(planGroupPricing.groupId, groupId))).limit(1);

  if (existing) {
    const [updated] = await db.update(planGroupPricing).set({
      specialPriceMinor: specialPriceMinor !== undefined ? specialPriceMinor : existing.specialPriceMinor,
      discountPercent: discountPercent !== undefined ? discountPercent : existing.discountPercent,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isActive: Boolean(isActive),
      updatedAt: new Date(),
    }).where(eq(planGroupPricing.id, existing.id)).returning();
    return updated;
  }

  const [created] = await db.insert(planGroupPricing).values({
    planId,
    groupId,
    specialPriceMinor: specialPriceMinor != null ? Number(specialPriceMinor) : null,
    discountPercent: discountPercent != null ? Number(discountPercent) : null,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    isActive: Boolean(isActive),
  }).returning();

  return created;
}

export async function listPlanGroupPricing(planId) {
  return db.select({
    id: planGroupPricing.id,
    planId: planGroupPricing.planId,
    groupId: planGroupPricing.groupId,
    groupName: driverGroups.name,
    groupCode: driverGroups.code,
    specialPriceMinor: planGroupPricing.specialPriceMinor,
    discountPercent: planGroupPricing.discountPercent,
    startDate: planGroupPricing.startDate,
    endDate: planGroupPricing.endDate,
    isActive: planGroupPricing.isActive,
    createdAt: planGroupPricing.createdAt,
    updatedAt: planGroupPricing.updatedAt,
  })
    .from(planGroupPricing)
    .innerJoin(driverGroups, eq(planGroupPricing.groupId, driverGroups.id))
    .where(eq(planGroupPricing.planId, planId));
}

export async function deletePlanGroupPricing(id) {
  const [deleted] = await db.delete(planGroupPricing).where(eq(planGroupPricing.id, id)).returning();
  if (!deleted) throw { statusCode: 404, message: 'Group pricing rule not found' };
  return { success: true, id };
}

// ── Driver subscription flow ───────────────────────────────────────────────────

export async function initiateSubscription(driverId, planId, idempotencyKey) {
  return withIdempotency('driver_subscription_initiate', idempotencyKey, driverId, async () => {
    const [rawPlan] = await db.select().from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.id, planId), eq(subscriptionPlans.isActive, true))).limit(1);
    if (!rawPlan) throw { statusCode: 404, message: 'Plan not found or inactive' };

    const plan = await resolvePlanPricingForDriver(rawPlan, driverId);
    if (!plan) {
      throw { statusCode: 403, message: 'You are not eligible for this exclusive subscription plan' };
    }

    const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
    if (!driver) throw { statusCode: 404, message: 'Driver not found' };

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
      metadata: { driverId, planId, planVersionId: plan.currentVersionId },
      idempotencyKey,
    });

    const [payment] = await db.insert(payments).values({
      subscriptionId: null,
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
      plan: {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        durationDays: plan.durationDays,
        currentVersionId: plan.currentVersionId,
      },
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

async function _activateSubscriptionIdempotent(driverId, planId, plan, amountMinor, paymentInfo) {
  if (!paymentInfo.gatewayOrderId) return _activateSubscription(driverId, planId, plan, amountMinor, paymentInfo);
  return withIdempotency('subscription_activation', paymentInfo.gatewayOrderId, driverId, () =>
    _activateSubscription(driverId, planId, plan, amountMinor, paymentInfo));
}

async function _activateSubscription(driverId, planId, plan, amountMinor, paymentInfo) {
  const now = new Date();

  // Expire any existing active sub
  await db.update(subscriptions).set({ status: 'expired', updatedAt: now }).where(
    and(eq(subscriptions.driverId, driverId), eq(subscriptions.status, 'active')),
  );

  const endDate = plan.durationDays ? addDays(now, plan.durationDays) : null;

  const [sub] = await db.insert(subscriptions).values({
    driverId,
    planId,
    planVersionId: plan.currentVersionId || null,
    status:       'active',
    startDate:    now,
    endDate,
    currentPeriodStart: now,
    currentPeriodEnd: endDate,
    currencyCode: plan.currencyCode,
    amountMinor,
  }).returning();

  // Record activation event in immutable journal
  await db.insert(subscriptionEvents).values({
    subscriptionId: sub.id,
    eventType: 'activated',
    fromStatus: 'pending',
    toStatus: 'active',
    actorType: paymentInfo.gateway ? 'webhook' : 'driver',
    actorId: driverId,
    reason: 'Subscription activated upon successful payment',
    metadata: {
      planId: plan.id,
      planVersionId: plan.currentVersionId,
      amountMinor,
      gatewayOrderId: paymentInfo.gatewayOrderId,
      gatewayPaymentId: paymentInfo.gatewayPaymentId,
    },
  });

  if (paymentInfo.paymentAttemptId) {
    await db.update(payments)
      .set({
        subscriptionId: sub.id, status: 'captured', updatedAt: now,
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
    planVersion:  subscriptionPlanVersions,
  }).from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .leftJoin(subscriptionPlanVersions, eq(subscriptions.planVersionId, subscriptionPlanVersions.id))
    .where(and(eq(subscriptions.driverId, driverId), eq(subscriptions.status, 'active')))
    .orderBy(desc(subscriptions.createdAt)).limit(1);
  return sub || null;
}

export async function getSubscriptionHistory(driverId, page, limit, offset) {
  const [{ total }] = await db.select({ total: count() }).from(subscriptions)
    .where(eq(subscriptions.driverId, driverId));
  const rows = await db.select({
    subscription: subscriptions,
    plan: subscriptionPlans,
    planVersion: subscriptionPlanVersions,
  })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .leftJoin(subscriptionPlanVersions, eq(subscriptions.planVersionId, subscriptionPlanVersions.id))
    .where(eq(subscriptions.driverId, driverId))
    .orderBy(desc(subscriptions.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

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

// ── Admin Subscribers & Comprehensive Management ──────────────────────────────

export async function listAllSubscribers({ page = 1, limit = 10, offset = 0, status, planId, countryId, search }) {
  const conditions = [];
  if (status) conditions.push(eq(subscriptions.status, status));
  if (planId) conditions.push(eq(subscriptions.planId, planId));
  if (countryId) conditions.push(eq(drivers.countryId, countryId));
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      sql`(${drivers.name} ILIKE ${term} OR ${drivers.phone} ILIKE ${term} OR ${drivers.email} ILIKE ${term} OR ${subscriptionPlans.name} ILIKE ${term})`
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(subscriptions)
    .innerJoin(drivers, eq(subscriptions.driverId, drivers.id))
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(where);

  const rows = await db
    .select({
      id: subscriptions.id,
      driverId: subscriptions.driverId,
      planId: subscriptions.planId,
      planVersionId: subscriptions.planVersionId,
      status: subscriptions.status,
      startDate: subscriptions.startDate,
      endDate: subscriptions.endDate,
      currentPeriodStart: subscriptions.currentPeriodStart,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      trialEndsAt: subscriptions.trialEndsAt,
      pausedAt: subscriptions.pausedAt,
      resumedAt: subscriptions.resumedAt,
      autoRenew: subscriptions.autoRenew,
      amountMinor: subscriptions.amountMinor,
      currencyCode: subscriptions.currencyCode,
      cancelledAt: subscriptions.cancelledAt,
      cancelNote: subscriptions.cancelNote,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
      driver: {
        id: drivers.id,
        name: drivers.name,
        phone: drivers.phone,
        email: drivers.email,
        subscriptionStatus: drivers.subscriptionStatus,
        approvalStatus: drivers.approvalStatus,
        isBlocked: drivers.isBlocked,
        countryId: drivers.countryId,
        cityId: drivers.cityId,
      },
      plan: {
        id: subscriptionPlans.id,
        name: subscriptionPlans.name,
        type: subscriptionPlans.type,
        priceMinor: subscriptionPlans.priceMinor,
        currencyCode: subscriptionPlans.currencyCode,
        durationDays: subscriptionPlans.durationDays,
        trialDays: subscriptionPlans.trialDays,
        countryId: subscriptionPlans.countryId,
      },
      planVersion: {
        id: subscriptionPlanVersions.id,
        version: subscriptionPlanVersions.version,
        name: subscriptionPlanVersions.name,
      },
    })
    .from(subscriptions)
    .innerJoin(drivers, eq(subscriptions.driverId, drivers.id))
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .leftJoin(subscriptionPlanVersions, eq(subscriptions.planVersionId, subscriptionPlanVersions.id))
    .where(where)
    .orderBy(desc(subscriptions.createdAt))
    .limit(limit)
    .offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getSubscriptionDetail(subscriptionId) {
  const [row] = await db
    .select({
      subscription: subscriptions,
      driver: drivers,
      plan: subscriptionPlans,
      planVersion: subscriptionPlanVersions,
    })
    .from(subscriptions)
    .innerJoin(drivers, eq(subscriptions.driverId, drivers.id))
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .leftJoin(subscriptionPlanVersions, eq(subscriptions.planVersionId, subscriptionPlanVersions.id))
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!row) throw { statusCode: 404, message: 'Subscription not found' };

  const subPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.subscriptionId, subscriptionId))
    .orderBy(desc(payments.createdAt));

  const events = await db
    .select()
    .from(subscriptionEvents)
    .where(eq(subscriptionEvents.subscriptionId, subscriptionId))
    .orderBy(desc(subscriptionEvents.createdAt));

  return {
    ...row.subscription,
    driver: row.driver,
    plan: row.plan,
    planVersion: row.planVersion,
    payments: subPayments,
    events,
  };
}

export async function getSubscriptionPlanById(planId) {
  const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  if (!plan) throw { statusCode: 404, message: 'Plan not found' };

  const [currentVersion] = await db
    .select()
    .from(subscriptionPlanVersions)
    .where(eq(subscriptionPlanVersions.planId, planId))
    .orderBy(desc(subscriptionPlanVersions.version))
    .limit(1);

  const [entitlements] = await db
    .select()
    .from(subscriptionPlanEntitlements)
    .where(eq(subscriptionPlanEntitlements.planId, planId))
    .limit(1);

  const vehicleTypes = await db
    .select({
      id: subscriptionPlanVehicleTypes.vehicleTypeId,
    })
    .from(subscriptionPlanVehicleTypes)
    .where(eq(subscriptionPlanVehicleTypes.planId, planId));

  const groupPricing = await listPlanGroupPricing(planId);

  const [{ activeSubscribers }] = await db
    .select({ activeSubscribers: count() })
    .from(subscriptions)
    .where(and(eq(subscriptions.planId, planId), eq(subscriptions.status, 'active')));

  return {
    ...plan,
    currentVersion,
    entitlements: plan.entitlements || entitlements?.customEntitlements || null,
    vehicleTypeIds: plan.vehicleTypeIds || vehicleTypes.map((v) => v.id),
    groupPricing,
    activeSubscribers: Number(activeSubscribers || 0),
  };
}

export async function listPlanVersions(planId) {
  return db
    .select()
    .from(subscriptionPlanVersions)
    .where(eq(subscriptionPlanVersions.planId, planId))
    .orderBy(desc(subscriptionPlanVersions.version));
}

export async function getSubscriptionAnalytics() {
  const [{ totalActive }] = await db
    .select({ totalActive: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'active'));

  const [{ totalPlans }] = await db
    .select({ totalPlans: count() })
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.isActive, true));

  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const [{ expiringSoon }] = await db
    .select({ expiringSoon: count() })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, 'active'),
        sql`${subscriptions.endDate} >= ${now}`,
        sql`${subscriptions.endDate} <= ${in7Days}`
      )
    );

  const [{ pastDue }] = await db
    .select({ pastDue: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, 'past_due'));

  const statusBreakdown = await db
    .select({
      status: subscriptions.status,
      count: count(),
    })
    .from(subscriptions)
    .groupBy(subscriptions.status);

  return {
    totalActive: Number(totalActive || 0),
    totalPlans: Number(totalPlans || 0),
    expiringSoon: Number(expiringSoon || 0),
    pastDue: Number(pastDue || 0),
    statusBreakdown,
  };
}

// ── Gateway webhooks ────────────────────────────────────────────────────────

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
  const now = new Date();
  const expired = await db.update(subscriptions)
    .set({ status: 'expired', updatedAt: now })
    .where(
      and(
        eq(subscriptions.status, 'active'),
        lt(subscriptions.endDate, now)
      )
    ).returning({ driverId: subscriptions.driverId, id: subscriptions.id });

  for (const { driverId, id } of expired) {
    await db.update(drivers)
      .set({ subscriptionStatus: 'expired', isOnline: false })
      .where(eq(drivers.id, driverId));

    await db.insert(subscriptionEvents).values({
      subscriptionId: id,
      eventType: 'expired',
      fromStatus: 'active',
      toStatus: 'expired',
      actorType: 'system',
      reason: 'Subscription reached duration expiration',
      metadata: { expiredAt: now.toISOString() },
    });

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
