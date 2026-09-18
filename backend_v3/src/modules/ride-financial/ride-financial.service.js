import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  rides,
  rideFinancials,
  subscriptions,
  subscriptionPlans,
  subscriptionPlanVersions,
  commissionRules,
  commissionRuleVersions,
} from '../../../drizzle/schema/index.js';
import { resolveDeterministicCommissionRule } from '../commission/commission-resolver.js';
import { resolveDriverEntitlements } from '../subscription/subscription-entitlement.service.js';
import { multiplyRate, ROUNDING_POLICIES } from '../../utils/money-math.js';

/**
 * Pure Calculation Engine: Computes complete financial breakdown for a ride.
 *
 * @param {object} params
 * @param {number|bigint} params.grossFareMinor - Total meter fare before promo deduction
 * @param {number} [params.promoDiscountMinor=0] - Promo discount amount absorbed by platform
 * @param {number} [params.tipMinor=0]
 * @param {number} [params.tollMinor=0]
 * @param {number} [params.taxMinor=0]
 * @param {object} params.rule - Resolved commission rule snapshot
 * @param {object} params.driverEntitlements - Driver subscription entitlements
 * @param {string} [params.currencyCode='INR']
 * @returns {object} Full financial calculation breakdown
 */
export function calculateRideFinancialBreakdown({
  grossFareMinor,
  promoDiscountMinor = 0,
  tipMinor = 0,
  tollMinor = 0,
  taxMinor = 0,
  rule,
  driverEntitlements,
  currencyCode = 'INR',
}) {
  const grossFare = Math.max(0, Math.round(Number(grossFareMinor) || 0));
  const promoDiscount = Math.max(0, Math.round(Number(promoDiscountMinor) || 0));
  const platformSubsidy = promoDiscount; // Platform absorbs promo discount

  const isSubscriber = Boolean(driverEntitlements?.isSubscriber);

  // 1. Resolve Booking Fee & Platform Fee
  let bookingFeeMinor = 0;
  if (!driverEntitlements?.waiveBookingFee) {
    if (driverEntitlements?.customBookingFeeMinor !== null && driverEntitlements?.customBookingFeeMinor !== undefined) {
      bookingFeeMinor = Math.min(Number(driverEntitlements.customBookingFeeMinor), grossFare);
    } else if (rule?.bookingFeeMinor) {
      bookingFeeMinor = Math.min(Number(rule.bookingFeeMinor), grossFare);
    }
  }

  const platformFeeMinor = Math.min(Number(rule?.platformFeeMinor || 0), Math.max(0, grossFare - bookingFeeMinor));
  const fixedPlatformCut = bookingFeeMinor + platformFeeMinor;

  // 2. Determine Commission Base
  const baseMode = rule?.commissionBase || 'fare_after_booking_fee';
  let commissionBaseMinor = 0;

  switch (baseMode) {
    case 'gross_fare':
      commissionBaseMinor = grossFare;
      break;
    case 'fare_after_booking_fee':
      commissionBaseMinor = Math.max(0, grossFare - bookingFeeMinor);
      break;
    case 'driver_fare':
      commissionBaseMinor = Math.max(0, grossFare - fixedPlatformCut - taxMinor);
      break;
    case 'net_fare':
      commissionBaseMinor = Math.max(0, grossFare - promoDiscount - fixedPlatformCut);
      break;
    default:
      commissionBaseMinor = Math.max(0, grossFare - bookingFeeMinor);
  }

  // 3. Resolve Commission Rate
  let commissionRate = 0;
  let rateSource = 'rule_non_subscriber';

  if (driverEntitlements?.commissionDiscountRate !== null && driverEntitlements?.commissionDiscountRate !== undefined) {
    commissionRate = Number(driverEntitlements.commissionDiscountRate);
    rateSource = 'plan_entitlement';
  } else if (isSubscriber) {
    commissionRate = parseFloat(rule?.subscriberRate ?? '0.0500');
    rateSource = 'rule_subscriber';
  } else {
    commissionRate = parseFloat(rule?.nonSubscriberRate ?? '0.2000');
    rateSource = 'rule_non_subscriber';
  }

  // 4. Calculate Variable Commission with strict integer rounding
  const variableCommissionMinor = multiplyRate(commissionBaseMinor, commissionRate, ROUNDING_POLICIES.ROUND_HALF_UP);
  let totalCommissionMinor = fixedPlatformCut + variableCommissionMinor;

  // 5. Apply Floor (minCommissionMinor) & Cap (maxCommissionMinor)
  const minFloor = Number(rule?.minCommissionMinor || 0);
  if (minFloor > 0 && totalCommissionMinor < minFloor) {
    totalCommissionMinor = minFloor;
  }

  const maxCap = rule?.maxCommissionMinor != null && rule.maxCommissionMinor !== '' ? Number(rule.maxCommissionMinor) : null;
  if (maxCap != null && maxCap > 0 && totalCommissionMinor > maxCap) {
    totalCommissionMinor = maxCap;
  }

  // Platform cut cannot exceed gross fare
  totalCommissionMinor = Math.min(totalCommissionMinor, grossFare);

  // 6. Driver Earnings & Platform Revenue
  const driverBaseFareEarning = Math.max(0, grossFare - totalCommissionMinor);
  const driverEarningMinor = driverBaseFareEarning + tipMinor + tollMinor; // tips & tolls go 100% to driver
  const platformRevenueMinor = totalCommissionMinor - platformSubsidy;

  return {
    currencyCode,
    grossFareMinor: grossFare,
    promoDiscountMinor: promoDiscount,
    platformSubsidyMinor: platformSubsidy,
    bookingFeeMinor,
    platformFeeMinor,
    commissionBaseMinor,
    commissionBase: baseMode,
    commissionRate: commissionRate.toFixed(4),
    rateSource,
    variableCommissionMinor,
    commissionMinor: totalCommissionMinor,
    minCommissionMinor: minFloor,
    maxCommissionMinor: maxCap,
    tipMinor,
    tollMinor,
    taxMinor,
    driverEarningMinor,
    platformRevenueMinor,
    isSubscriber,
    subscriptionId: driverEntitlements?.subscriptionId || null,
    subscriptionPlanId: driverEntitlements?.planId || null,
    subscriptionPlanVersionId: driverEntitlements?.planVersionId || null,
    subscriptionPlanVersion: driverEntitlements?.planVersion || 1,
    commissionRuleId: rule?.id || null,
    commissionRuleVersionId: rule?.currentVersionId || null,
    commissionRuleVersion: rule?.version || 1,
    ruleName: rule?.name || 'Standard Commission',
    resolutionTier: rule?.resolutionTier || 'default',
  };
}

/**
 * Creates or retrieves the immutable financial snapshot for a ride.
 *
 * @param {string} rideId
 * @param {object} [options={}]
 * @param {Date} [options.evaluatedAt]
 * @returns {Promise<object>} Persisted ride_financials row
 */
export async function getOrCalculateRideFinancials(rideId, { evaluatedAt = null } = {}) {
  // Check if immutable snapshot already exists
  const [existing] = await db
    .select()
    .from(rideFinancials)
    .where(eq(rideFinancials.rideId, rideId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) throw { statusCode: 404, message: `Ride ${rideId} not found` };

  const calculationTimestamp = evaluatedAt || ride.completedAt || ride.requestedAt || new Date();

  // 1. Resolve Driver Entitlements
  const driverEntitlements = ride.driverId
    ? await resolveDriverEntitlements(ride.driverId, {
        vehicleTypeId: ride.vehicleTypeId,
        effectiveAt: calculationTimestamp,
      })
    : { isSubscriber: false };

  // 2. Resolve Commission Rule via Deterministic Waterfall
  const resolvedCityId = ride.fareSnapshot?.cityId || ride.cityId || null;
  const rule = await resolveDeterministicCommissionRule({
    vehicleTypeId: ride.vehicleTypeId,
    countryId: ride.countryId,
    cityId: resolvedCityId,
    evaluatedAt: calculationTimestamp,
  });

  // 3. Extract Gross Fare and Modifiers
  const promoDiscountMinor =
    ride.fareSnapshot?.breakdown?.promo?.discountAmountMinor ||
    ride.fareSnapshot?.discountAmountMinor ||
    ride.discountAmountMinor ||
    0;

  const grossFareMinor =
    ride.grossFareMinor ||
    ride.fareSnapshot?.grossFareMinor ||
    ride.fareSnapshot?.originalEstimatedFareMinor ||
    Math.max(ride.finalFareMinor || 0, (ride.finalFareMinor || 0) + promoDiscountMinor);

  const tipMinor = Number(ride.tipMinor || 0);
  const tollMinor = Number(ride.tollMinor || 0);
  const taxMinor = Number(ride.taxMinor || 0);

  // 4. Calculate Financials
  const calculated = calculateRideFinancialBreakdown({
    grossFareMinor,
    promoDiscountMinor,
    tipMinor,
    tollMinor,
    taxMinor,
    rule,
    driverEntitlements,
    currencyCode: ride.currencyCode || 'INR',
  });

  // 5. Persist Immutable Snapshot into ride_financials
  const [persisted] = await db
    .insert(rideFinancials)
    .values({
      rideId: ride.id,
      currencyCode: calculated.currencyCode,
      grossFareMinor: calculated.grossFareMinor,
      bookingFeeMinor: calculated.bookingFeeMinor,
      platformFeeMinor: calculated.platformFeeMinor,
      commissionBaseMinor: calculated.commissionBaseMinor,
      commissionBase: calculated.commissionBase,
      commissionRate: calculated.commissionRate,
      commissionMinor: calculated.commissionMinor,
      promoDiscountMinor: calculated.promoDiscountMinor,
      platformSubsidyMinor: calculated.platformSubsidyMinor,
      taxMinor: calculated.taxMinor,
      tollMinor: calculated.tollMinor,
      tipMinor: calculated.tipMinor,
      driverEarningMinor: calculated.driverEarningMinor,
      platformRevenueMinor: calculated.platformRevenueMinor,
      isSubscriber: calculated.isSubscriber,
      subscriptionId: calculated.subscriptionId,
      subscriptionPlanId: calculated.subscriptionPlanId,
      subscriptionPlanVersionId: calculated.subscriptionPlanVersionId,
      subscriptionPlanVersion: calculated.subscriptionPlanVersion,
      commissionRuleId: calculated.commissionRuleId,
      commissionRuleVersionId: calculated.commissionRuleVersionId,
      commissionRuleVersion: calculated.commissionRuleVersion,
      breakdown: {
        ...calculated,
        ruleSnapshot: {
          id: rule.id,
          name: rule.name,
          version: rule.version,
          tier: rule.resolutionTier,
        },
      },
      calculatedAt: calculationTimestamp,
    })
    .onConflictDoUpdate({
      target: rideFinancials.rideId,
      set: {
        updatedAt: new Date(),
      },
    })
    .returning();

  return persisted;
}
