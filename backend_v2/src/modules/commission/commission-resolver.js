import { eq, and, isNull, desc, lte, gte, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  commissionRules,
  cityTypeFares,
  cities,
} from '../../../drizzle/schema/index.js';

/**
 * Deterministic Commission Rule Resolver.
 *
 * Fallback Hierarchy:
 *   Tier 1: Specific City + Vehicle Type + Service Type + Plan Tier (Explicit custom rule)
 *   Tier 2: Specific City + Vehicle Type + Service Type
 *   Tier 3: Specific City + Vehicle Type
 *   Tier 4: City Type + Vehicle Type (Automatically resolved from city_type_fares)
 *   Tier 5: City Default (cityId set, others null)
 *   Tier 6: Country + Vehicle Type + Service Type
 *   Tier 7: Country + Vehicle Type
 *   Tier 8: Country Default
 *   Tier 9: Global Default
 *
 * @param {object} params
 * @param {string} [params.vehicleTypeId=null]
 * @param {string} [params.countryId=null]
 * @param {string} [params.cityId=null]
 * @param {string} [params.cityTypeId=null]
 * @param {string} [params.serviceTypeId=null]
 * @param {string} [params.planTierId=null]
 * @param {Date} [params.evaluatedAt=new Date()]
 * @returns {Promise<object>} resolved rule configuration snapshot
 */
export async function resolveDeterministicCommissionRule({
  vehicleTypeId = null,
  countryId = null,
  cityId = null,
  cityTypeId = null,
  serviceTypeId = null,
  planTierId = null,
  evaluatedAt = new Date(),
  tx = null,
} = {}) {
  const dbClient = tx || db;
  const effectiveDate = evaluatedAt instanceof Date ? evaluatedAt : new Date(evaluatedAt);

  // Helper condition builder for effective dating and active status
  const effectiveCondition = and(
    eq(commissionRules.isActive, true),
    lte(commissionRules.effectiveFrom, effectiveDate),
    or(isNull(commissionRules.effectiveTo), gte(commissionRules.effectiveTo, effectiveDate))
  );

  // ── Tier 1: City + Vehicle Type + Service Type + Plan Tier ──
  if (cityId && vehicleTypeId && serviceTypeId && planTierId) {
    const [match] = await dbClient
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
    const [match] = await dbClient
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

  // ── Tier 3: Specific City + Vehicle Type Custom Override ──
  if (cityId && vehicleTypeId) {
    const [match] = await dbClient
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

    if (match) return formatResolvedRule(match, 'city_vehicle_custom');
  }

  // ── Tier 4: City-Type + Vehicle Type (Inherited automatically from city_type_fares) ──
  let resolvedCityTypeId = cityTypeId;
  if (!resolvedCityTypeId && cityId) {
    const [cityRow] = await dbClient.select({ cityTypeId: cities.cityTypeId })
      .from(cities)
      .where(eq(cities.id, cityId))
      .limit(1);
    resolvedCityTypeId = cityRow?.cityTypeId || null;
  }

  if (resolvedCityTypeId && vehicleTypeId) {
    const [cityTypeFare] = await dbClient
      .select()
      .from(cityTypeFares)
      .where(
        and(
          eq(cityTypeFares.isActive, true),
          eq(cityTypeFares.cityTypeId, resolvedCityTypeId),
          eq(cityTypeFares.vehicleTypeId, vehicleTypeId)
        )
      )
      .limit(1);

    if (cityTypeFare) {
      return {
        id: cityTypeFare.id,
        currentVersionId: null,
        version: 1,
        name: `City-Type Vehicle Commission Rate`,
        resolutionTier: 'city_type_vehicle_fare',
        commissionBase: 'fare_after_booking_fee',
        bookingFeeMinor: Number(cityTypeFare.bookingFeeMinor || 0),
        platformFeeMinor: Number(cityTypeFare.platformFeeMinor || 0),
        subscriberRate: String(cityTypeFare.subscriberCommissionRate || '0.0500'),
        nonSubscriberRate: String(cityTypeFare.nonSubscriberCommissionRate || '0.2000'),
        minCommissionMinor: Number(cityTypeFare.minCommissionMinor || 0),
        maxCommissionMinor: cityTypeFare.maxCommissionMinor != null ? Number(cityTypeFare.maxCommissionMinor) : null,
        priority: 10,
        countryId,
        cityId,
        vehicleTypeId,
        serviceTypeId,
        planTierId,
      };
    }
  }

  // ── Tier 5: City Default (cityId set, vehicleTypeId is NULL) ──
  if (cityId) {
    const [match] = await dbClient
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

  // ── Tier 6: Country + Vehicle Type + Service Type ──
  if (countryId && vehicleTypeId && serviceTypeId) {
    const [match] = await dbClient
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

  // ── Tier 7: Country + Vehicle Type ──
  if (countryId && vehicleTypeId) {
    const [match] = await dbClient
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

  // ── Tier 8: Country Default (both cityId & vehicleTypeId are null) ──
  if (countryId) {
    const [match] = await dbClient
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

  // ── Tier 9: Global Default (cityId, countryId, and vehicleTypeId all null) ──
  const [globalMatch] = await dbClient
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
