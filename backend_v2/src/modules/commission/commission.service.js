import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { commissionRules, commissionRuleVersions, vehicleTypes, countries, cities } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { resolveDeterministicCommissionRule } from './commission-resolver.js';
import { calculateRideFinancialBreakdown } from '../ride-financial/ride-financial.service.js';
import { logCommercialAudit } from '../admin/commercial-audit.service.js';

/**
 * Commission-rule resolution — uses the industrial 8-tier deterministic waterfall.
 */
export async function resolveCommissionRule(paramsOrVehicleTypeId, countryIdParam, cityIdParam) {
  let vehicleTypeId = null;
  let countryId = null;
  let cityId = null;
  let serviceTypeId = null;
  let planTierId = null;
  let evaluatedAt = new Date();

  if (paramsOrVehicleTypeId && typeof paramsOrVehicleTypeId === 'object') {
    vehicleTypeId = paramsOrVehicleTypeId.vehicleTypeId || null;
    countryId = paramsOrVehicleTypeId.countryId || null;
    cityId = paramsOrVehicleTypeId.cityId || null;
    serviceTypeId = paramsOrVehicleTypeId.serviceTypeId || null;
    planTierId = paramsOrVehicleTypeId.planTierId || null;
    evaluatedAt = paramsOrVehicleTypeId.evaluatedAt || new Date();
  } else {
    vehicleTypeId = paramsOrVehicleTypeId || null;
    countryId = countryIdParam || null;
    cityId = cityIdParam || null;
  }

  return resolveDeterministicCommissionRule({
    vehicleTypeId,
    countryId,
    cityId,
    serviceTypeId,
    planTierId,
    evaluatedAt,
  });
}

/**
 * Pure calculation function for commission split.
 */
export function computeCommission({
  finalFareMinor,
  rule,
  isSubscriber,
  customRate = null,
  customBookingFeeMinor = null,
  waiveBookingFee = false,
  tipMinor = 0,
  tollMinor = 0,
  taxMinor = 0,
}) {
  const driverEntitlements = {
    isSubscriber: !!isSubscriber,
    commissionDiscountRate: customRate,
    customBookingFeeMinor,
    waiveBookingFee,
  };

  const calculated = calculateRideFinancialBreakdown({
    grossFareMinor: finalFareMinor,
    promoDiscountMinor: 0,
    tipMinor,
    tollMinor,
    taxMinor,
    rule,
    driverEntitlements,
  });

  return {
    bookingFeeMinor: calculated.bookingFeeMinor,
    platformFeeMinor: calculated.platformFeeMinor,
    rate: Number(calculated.commissionRate),
    commissionMinor: calculated.commissionMinor,
    driverEarningsMinor: calculated.driverEarningMinor,
    minCommissionMinor: calculated.minCommissionMinor,
    maxCommissionMinor: calculated.maxCommissionMinor,
    resolutionTier: calculated.resolutionTier,
    isSubscriber: calculated.isSubscriber,
    customPlanRate: customRate !== null,
    ruleId: calculated.commissionRuleId,
    ruleName: calculated.ruleName,
    commissionBase: calculated.commissionBase,
    commissionBaseMinor: calculated.commissionBaseMinor,
  };
}

// ── Admin CRUD & Versioning ──────────────────────────────────────────────────

export async function listRules(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.isActive !== undefined) conditions.push(eq(commissionRules.isActive, filters.isActive));
  if (filters.countryId) conditions.push(eq(commissionRules.countryId, filters.countryId));
  if (filters.cityId) conditions.push(eq(commissionRules.cityId, filters.cityId));
  if (filters.vehicleTypeId) conditions.push(eq(commissionRules.vehicleTypeId, filters.vehicleTypeId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(commissionRules).where(where);
  const rows = await db
    .select({
      rule: commissionRules,
      vehicleType: vehicleTypes,
      country: countries,
      city: cities,
    })
    .from(commissionRules)
    .leftJoin(vehicleTypes, eq(commissionRules.vehicleTypeId, vehicleTypes.id))
    .leftJoin(countries, eq(commissionRules.countryId, countries.id))
    .leftJoin(cities, eq(commissionRules.cityId, cities.id))
    .where(where)
    .orderBy(desc(commissionRules.priority), desc(commissionRules.createdAt))
    .limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getById(id) {
  const [rule] = await db.select().from(commissionRules).where(eq(commissionRules.id, id)).limit(1);
  if (!rule) throw { statusCode: 404, message: 'Commission rule not found' };
  return rule;
}

export async function create(data, adminId = null) {
  const version = data.version || 1;
  const [rule] = await db.insert(commissionRules).values({
    ...data,
    version,
    effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : new Date(),
    effectiveTo: data.effectiveTo ? new Date(data.effectiveTo) : null,
  }).returning();

  // Create corresponding version row
  const [ruleVersion] = await db.insert(commissionRuleVersions).values({
    ruleId: rule.id,
    version: rule.version,
    name: rule.name,
    countryId: rule.countryId,
    cityId: rule.cityId,
    vehicleTypeId: rule.vehicleTypeId,
    serviceTypeId: rule.serviceTypeId,
    planTierId: rule.planTierId,
    bookingFeeMinor: rule.bookingFeeMinor,
    platformFeeMinor: rule.platformFeeMinor || 0,
    subscriberRate: rule.subscriberRate,
    nonSubscriberRate: rule.nonSubscriberRate,
    commissionBase: rule.commissionBase,
    minCommissionMinor: rule.minCommissionMinor,
    maxCommissionMinor: rule.maxCommissionMinor,
    priority: rule.priority,
    effectiveFrom: rule.effectiveFrom,
    effectiveTo: rule.effectiveTo,
    isActive: rule.isActive,
    changeSummary: 'Initial version created',
    createdByAdminId: adminId,
  }).returning();

  await db.update(commissionRules)
    .set({ currentVersionId: ruleVersion.id })
    .where(eq(commissionRules.id, rule.id));

  await logCommercialAudit({
    actorId: adminId,
    action: 'create',
    entityType: 'commission_rule',
    entityId: rule.id,
    newValue: rule,
    reason: 'Initial commission rule creation',
  });

  return rule;
}

export async function createRuleVersion(ruleId, newVersionData, adminId = null, reason = 'Rule version updated') {
  const [currentRule] = await db.select().from(commissionRules).where(eq(commissionRules.id, ruleId)).limit(1);
  if (!currentRule) throw { statusCode: 404, message: 'Commission rule not found' };

  const newVersionNumber = (currentRule.version || 1) + 1;
  const now = new Date();

  // Close previous active version effectiveTo
  await db.update(commissionRuleVersions)
    .set({ effectiveTo: now, updatedAt: now })
    .where(and(eq(commissionRuleVersions.ruleId, ruleId), isNull(commissionRuleVersions.effectiveTo)));

  // Insert new version
  const [createdVersion] = await db.insert(commissionRuleVersions).values({
    ruleId,
    version: newVersionNumber,
    name: newVersionData.name || currentRule.name,
    countryId: newVersionData.countryId !== undefined ? newVersionData.countryId : currentRule.countryId,
    cityId: newVersionData.cityId !== undefined ? newVersionData.cityId : currentRule.cityId,
    vehicleTypeId: newVersionData.vehicleTypeId !== undefined ? newVersionData.vehicleTypeId : currentRule.vehicleTypeId,
    serviceTypeId: newVersionData.serviceTypeId !== undefined ? newVersionData.serviceTypeId : currentRule.serviceTypeId,
    planTierId: newVersionData.planTierId !== undefined ? newVersionData.planTierId : currentRule.planTierId,
    bookingFeeMinor: newVersionData.bookingFeeMinor !== undefined ? newVersionData.bookingFeeMinor : currentRule.bookingFeeMinor,
    platformFeeMinor: newVersionData.platformFeeMinor !== undefined ? newVersionData.platformFeeMinor : (currentRule.platformFeeMinor || 0),
    subscriberRate: newVersionData.subscriberRate !== undefined ? newVersionData.subscriberRate : currentRule.subscriberRate,
    nonSubscriberRate: newVersionData.nonSubscriberRate !== undefined ? newVersionData.nonSubscriberRate : currentRule.nonSubscriberRate,
    commissionBase: newVersionData.commissionBase !== undefined ? newVersionData.commissionBase : currentRule.commissionBase,
    minCommissionMinor: newVersionData.minCommissionMinor !== undefined ? newVersionData.minCommissionMinor : currentRule.minCommissionMinor,
    maxCommissionMinor: newVersionData.maxCommissionMinor !== undefined ? newVersionData.maxCommissionMinor : currentRule.maxCommissionMinor,
    priority: newVersionData.priority !== undefined ? newVersionData.priority : currentRule.priority,
    effectiveFrom: newVersionData.effectiveFrom ? new Date(newVersionData.effectiveFrom) : now,
    effectiveTo: newVersionData.effectiveTo ? new Date(newVersionData.effectiveTo) : null,
    isActive: newVersionData.isActive !== undefined ? newVersionData.isActive : true,
    changeSummary: reason,
    createdByAdminId: adminId,
  }).returning();

  // Update current master rule pointer
  const [updatedRule] = await db.update(commissionRules).set({
    ...newVersionData,
    version: newVersionNumber,
    currentVersionId: createdVersion.id,
    updatedAt: now,
  }).where(eq(commissionRules.id, ruleId)).returning();

  await logCommercialAudit({
    actorId: adminId,
    action: 'version_created',
    entityType: 'commission_rule',
    entityId: ruleId,
    oldValue: currentRule,
    newValue: updatedRule,
    reason,
  });

  return updatedRule;
}

export async function update(id, data, adminId = null) {
  const [currentRule] = await db.select().from(commissionRules).where(eq(commissionRules.id, id)).limit(1);
  if (!currentRule) throw { statusCode: 404, message: 'Commission rule not found' };

  // If financial rates or scoping changed, create a new immutable version
  const hasFinancialChanges = (
    (data.subscriberRate !== undefined && data.subscriberRate !== currentRule.subscriberRate) ||
    (data.nonSubscriberRate !== undefined && data.nonSubscriberRate !== currentRule.nonSubscriberRate) ||
    (data.bookingFeeMinor !== undefined && data.bookingFeeMinor !== currentRule.bookingFeeMinor) ||
    (data.commissionBase !== undefined && data.commissionBase !== currentRule.commissionBase)
  );

  if (hasFinancialChanges) {
    return createRuleVersion(id, data, adminId, 'Financial parameter update');
  }

  data.updatedAt = new Date();
  const [rule] = await db.update(commissionRules).set(data).where(eq(commissionRules.id, id)).returning();

  await logCommercialAudit({
    actorId: adminId,
    action: 'update',
    entityType: 'commission_rule',
    entityId: id,
    oldValue: currentRule,
    newValue: rule,
  });

  return rule;
}

export async function setActive(id, isActive, adminId) {
  const [rule] = await db.update(commissionRules)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(commissionRules.id, id)).returning();
  if (!rule) throw { statusCode: 404, message: 'Commission rule not found' };

  await logCommercialAudit({
    actorId: adminId,
    action: isActive ? 'activate' : 'deactivate',
    entityType: 'commission_rule',
    entityId: id,
    newValue: { isActive },
  });

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: isActive ? 'COMMISSION_RULE_ENABLED' : 'COMMISSION_RULE_DISABLED',
    entityType: 'commission_rule', entityId: id,
  });
  return rule;
}
