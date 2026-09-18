import { eq, and, desc, isNull, lte, gte, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { pricingPlans, pricingPlanVersions, pricingVersions } from '../../../drizzle/schema/index.js';

/**
 * Resolves the best active pricing plan and version for a given context:
 * Hierarchy:
 *   1. Zone + Vehicle Type Pricing Plan (Specific)
 *   2. City + Vehicle Type Pricing Plan (City-wide fallback)
 *   3. Legacy pricing_versions fallback
 */
export async function resolvePricingVersion({
  vehicleTypeId,
  cityId = null,
  zoneId = null,
  cityTypeId = null,
  countryId = null,
}) {
  if (!vehicleTypeId) throw { statusCode: 400, message: 'vehicleTypeId is required to resolve a pricing version' };

  const now = new Date();

  // Helper: Try to find pricing plan and active version
  const tryPlan = async (scope, zoneIdParam = null) => {
    if (!cityId) return null;

    const conditions = [
      eq(pricingPlans.isActive, true),
      eq(pricingPlans.cityId, cityId),
      eq(pricingPlans.vehicleTypeId, vehicleTypeId),
      eq(pricingPlans.scope, scope),
    ];

    if (scope === 'zone' && zoneIdParam) {
      conditions.push(eq(pricingPlans.zoneId, zoneIdParam));
    }

    const [plan] = await db.select().from(pricingPlans)
      .where(and(...conditions))
      .orderBy(desc(pricingPlans.createdAt))
      .limit(1);

    if (!plan) return null;

    // Fetch active version for plan
    const [version] = await db.select().from(pricingPlanVersions)
      .where(and(
        eq(pricingPlanVersions.pricingPlanId, plan.id),
        eq(pricingPlanVersions.isActive, true),
        lte(pricingPlanVersions.effectiveFrom, now),
        or(isNull(pricingPlanVersions.effectiveTo), gte(pricingPlanVersions.effectiveTo, now)),
      ))
      .orderBy(desc(pricingPlanVersions.version), desc(pricingPlanVersions.createdAt))
      .limit(1);

    if (version) {
      // Normalize to rateCard structure
      return {
        version: {
          id: version.id,
          pricingPlanId: plan.id,
          version: version.version,
          baseFareMinor: version.baseFare,
          minFareMinor: version.minimumFare,
          perKmRateMinor: version.distanceRate,
          perMinRateMinor: version.timeRate,
          bookingFeeMinor: version.bookingFee,
          serviceFeeMinor: version.platformFee,
          waitingPricePerMinMinor: version.waitingRate,
          waitingGracePeriodMin: version.freeWaitingMinutes,
          cancellationFeeMinor: version.cancellationFee,
          surgeFloorMultiplier: '1.00',
          surgeCapMultiplier: '3.00',
          currencyCode: plan.currencyCode,
        },
        source: scope === 'zone' ? 'zone_pricing_plan' : 'city_pricing_plan',
      };
    }

    return null;
  };

  // 1. Try Zone-specific Pricing Plan
  if (zoneId) {
    const zonePlan = await tryPlan('zone', zoneId);
    if (zonePlan) return zonePlan;
  }

  // 2. Try City-wide Pricing Plan
  if (cityId) {
    const cityPlan = await tryPlan('city');
    if (cityPlan) return cityPlan;
  }

  // 3. Fallback to existing pricing_versions table
  const base = [
    eq(pricingVersions.isActive, true),
    eq(pricingVersions.vehicleTypeId, vehicleTypeId),
    lte(pricingVersions.effectiveFrom, now),
    or(isNull(pricingVersions.effectiveTo), gte(pricingVersions.effectiveTo, now)),
  ];

  const tryFetchLegacy = async (extraConditions, source) => {
    const [row] = await db.select().from(pricingVersions)
      .where(and(...base, ...extraConditions))
      .orderBy(desc(pricingVersions.version), desc(pricingVersions.createdAt))
      .limit(1);
    return row ? { version: row, source } : null;
  };

  if (zoneId) {
    const res = await tryFetchLegacy([eq(pricingVersions.zoneId, zoneId)], 'legacy_zone_version');
    if (res) return res;
  }

  if (cityId) {
    const res = await tryFetchLegacy([eq(pricingVersions.cityId, cityId), isNull(pricingVersions.zoneId)], 'legacy_city_version');
    if (res) return res;
  }

  // 4. Any active rate card fallback
  const [anyActive] = await db.select().from(pricingVersions)
    .where(and(eq(pricingVersions.isActive, true), eq(pricingVersions.vehicleTypeId, vehicleTypeId)))
    .orderBy(desc(pricingVersions.version), desc(pricingVersions.createdAt))
    .limit(1);

  if (anyActive) {
    return { version: anyActive, source: 'vehicle_type_fallback' };
  }

  throw {
    statusCode: 422,
    message: `No active pricing plan configured for vehicleTypeId='${vehicleTypeId}'. Please create a pricing plan in the admin portal.`,
  };
}
