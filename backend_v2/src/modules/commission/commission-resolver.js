import { eq, and, isNull, desc, lte, gte, or, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  commissionRules,
  commissionRuleVersions,
  vehicleTypes,
  countries,
  cities,
} from '../../../drizzle/schema/index.js';

/**
 * Deterministic 8-Tier Waterfall Commission Rule Resolver.
 *
 * Fallback Hierarchy:
 *   Tier 1: City + Vehicle Type + Service Type + Plan Tier
 *   Tier 2: City + Vehicle Type + Service Type
 *   Tier 3: City + Vehicle Type
 *   Tier 4: City Default (cityId set, others null)
 *   Tier 5: Country + Vehicle Type + Service Type
 *   Tier 6: Country + Vehicle Type
 *   Tier 7: Country Default (countryId set, others null)
 *   Tier 8: Global Default (all scope identifiers null)
 *
 * Effective Dating:
 *   Rule must satisfy: effectiveFrom <= evaluatedAt AND (effectiveTo IS NULL OR effectiveTo >= evaluatedAt)
 *
 * Tie-Breaker:
 *   ORDER BY priority DESC, version DESC, createdAt DESC
 *
 * @param {object} params
 * @param {string} [params.vehicleTypeId=null]
 * @param {string} [params.countryId=null]
 * @param {string} [params.cityId=null]
 * @param {string} [params.serviceTypeId=null]
 * @param {string} [params.planTierId=null]
 * @param {Date} [params.evaluatedAt=new Date()]
 * @returns {Promise<object>} resolved rule configuration snapshot
 */
export async function resolveDeterministicCommissionRule({
  vehicleTypeId = null,
  countryId = null,
  cityId = null,
  serviceTypeId = null,
  planTierId = null,
  evaluatedAt = new Date(),
} = {}) {
  const effectiveDate = evaluatedAt instanceof Date ? evaluatedAt : new Date(evaluatedAt);

  // Helper condition builder for effective dating and active status
  const effectiveCondition = and(
    eq(commissionRules.isActive, true),
    lte(commissionRules.effectiveFrom, effectiveDate),
    or(isNull(commissionRules.effectiveTo), gte(commissionRules.effectiveTo, effectiveDate))
  );

  // ── Tier 1: City + Vehicle Type + Service Type + Plan Tier ──
  if (cityId && vehicleTypeId && serviceTypeId && planTierId) {
    const [match] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          effectiveCondition,
          eq(commissionRules.cityId, cityId),
          eq(commissionRules.vehicleTypeId, vehicleTypeId),
          eq(commissionRules.serviceTypeId, serviceTypeId),
          eq(commissionRules.planTierId, planTierId)
        )
      )
      .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
      .limit(1);

    if (match) return formatResolvedRule(match, 'city_vehicle_service_tier');
  }

  // ── Tier 2: City + Vehicle Type + Service Type ──
  if (cityId && vehicleTypeId && serviceTypeId) {
    const [match] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          effectiveCondition,
          eq(commissionRules.cityId, cityId),
          eq(commissionRules.vehicleTypeId, vehicleTypeId),
          eq(commissionRules.serviceTypeId, serviceTypeId),
          isNull(commissionRules.planTierId)
        )
      )
      .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
      .limit(1);

    if (match) return formatResolvedRule(match, 'city_vehicle_service');
  }

  // ── Tier 3: City + Vehicle Type (Exact Local) ──
  if (cityId && vehicleTypeId) {
    const [match] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          effectiveCondition,
          eq(commissionRules.cityId, cityId),
          eq(commissionRules.vehicleTypeId, vehicleTypeId),
          isNull(commissionRules.serviceTypeId),
          isNull(commissionRules.planTierId)
        )
      )
      .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
      .limit(1);

    if (match) return formatResolvedRule(match, 'city_vehicle');
  }

  // ── Tier 4: City Default (cityId set, vehicleTypeId is NULL) ──
  if (cityId) {
    const [match] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          effectiveCondition,
          eq(commissionRules.cityId, cityId),
          isNull(commissionRules.vehicleTypeId),
          isNull(commissionRules.serviceTypeId),
          isNull(commissionRules.planTierId)
        )
      )
      .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
      .limit(1);

    if (match) return formatResolvedRule(match, 'city_default');
  }

  // ── Tier 5: Country + Vehicle Type + Service Type ──
  if (countryId && vehicleTypeId && serviceTypeId) {
    const [match] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          effectiveCondition,
          isNull(commissionRules.cityId),
          eq(commissionRules.countryId, countryId),
          eq(commissionRules.vehicleTypeId, vehicleTypeId),
          eq(commissionRules.serviceTypeId, serviceTypeId),
          isNull(commissionRules.planTierId)
        )
      )
      .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
      .limit(1);

    if (match) return formatResolvedRule(match, 'country_vehicle_service');
  }

  // ── Tier 6: Country + Vehicle Type ──
  if (countryId && vehicleTypeId) {
    const [match] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          effectiveCondition,
          isNull(commissionRules.cityId),
          eq(commissionRules.countryId, countryId),
          eq(commissionRules.vehicleTypeId, vehicleTypeId),
          isNull(commissionRules.serviceTypeId),
          isNull(commissionRules.planTierId)
        )
      )
      .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
      .limit(1);

    if (match) return formatResolvedRule(match, 'country_vehicle');
  }

  // ── Tier 7: Country Default (both cityId & vehicleTypeId are null) ──
  if (countryId) {
    const [match] = await db
      .select()
      .from(commissionRules)
      .where(
        and(
          effectiveCondition,
          isNull(commissionRules.cityId),
          eq(commissionRules.countryId, countryId),
          isNull(commissionRules.vehicleTypeId),
          isNull(commissionRules.serviceTypeId),
          isNull(commissionRules.planTierId)
        )
      )
      .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
      .limit(1);

    if (match) return formatResolvedRule(match, 'country_default');
  }

  // ── Tier 8: Global Default (cityId, countryId, and vehicleTypeId all null) ──
  const [globalMatch] = await db
    .select()
    .from(commissionRules)
    .where(
      and(
        effectiveCondition,
        isNull(commissionRules.cityId),
        isNull(commissionRules.countryId),
        isNull(commissionRules.vehicleTypeId),
        isNull(commissionRules.serviceTypeId),
        isNull(commissionRules.planTierId)
      )
    )
    .orderBy(desc(commissionRules.priority), desc(commissionRules.version), desc(commissionRules.createdAt))
    .limit(1);

  if (globalMatch) return formatResolvedRule(globalMatch, 'global');

  // Fallback safe default object if no rule is present in DB
  return {
    id: null,
    currentVersionId: null,
    version: 1,
    name: 'System Default Fallback',
    resolutionTier: 'fallback_default',
    commissionBase: 'fare_after_booking_fee',
    bookingFeeMinor: 0,
    platformFeeMinor: 0,
    subscriberRate: '0.0500',
    nonSubscriberRate: '0.2000',
    minCommissionMinor: 0,
    maxCommissionMinor: null,
    priority: 1,
  };
}

/**
 * Standardizes the resolved rule object.
 */
function formatResolvedRule(rule, resolutionTier) {
  return {
    id: rule.id,
    currentVersionId: rule.currentVersionId || null,
    version: rule.version || 1,
    name: rule.name,
    resolutionTier,
    commissionBase: rule.commissionBase || 'fare_after_booking_fee',
    bookingFeeMinor: Number(rule.bookingFeeMinor || 0),
    platformFeeMinor: Number(rule.platformFeeMinor || 0),
    subscriberRate: String(rule.subscriberRate || '0.0500'),
    nonSubscriberRate: String(rule.nonSubscriberRate || '0.2000'),
    minCommissionMinor: Number(rule.minCommissionMinor || 0),
    maxCommissionMinor: rule.maxCommissionMinor != null ? Number(rule.maxCommissionMinor) : null,
    priority: Number(rule.priority || 1),
    countryId: rule.countryId,
    cityId: rule.cityId,
    vehicleTypeId: rule.vehicleTypeId,
    serviceTypeId: rule.serviceTypeId,
    planTierId: rule.planTierId,
  };
}
