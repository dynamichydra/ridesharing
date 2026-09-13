import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../src/config/db.js';
import {
  subscriptionPlans,
  subscriptionPlanVersions,
  subscriptionPlanVehicleTypes,
  subscriptionPlanEntitlements,
  subscriptions,
  commissionRules,
  commissionRuleVersions,
} from '../drizzle/schema/index.js';

/**
 * Phased Data Backfill Migration: Commercial Subsystem v2
 * Safely backfills existing unversioned plans and rules into immutable version 1 records,
 * normalizes vehicle type associations, extracts entitlements, and links active subscriptions.
 */
export async function migrateCommercialSubsystemV2() {
  console.log('🚀 Starting Commercial Subsystem v2 Data Migration...');

  // 1. Backfill Subscription Plans & Versions
  const plans = await db.select().from(subscriptionPlans);
  console.log(`📦 Found ${plans.length} subscription plans to inspect/migrate`);

  for (const plan of plans) {
    let [version] = await db
      .select()
      .from(subscriptionPlanVersions)
      .where(eq(subscriptionPlanVersions.planId, plan.id))
      .limit(1);

    if (!version) {
      console.log(`  ➕ Creating Version 1 for plan: "${plan.name}" (${plan.id})`);
      [version] = await db
        .insert(subscriptionPlanVersions)
        .values({
          planId: plan.id,
          version: 1,
          name: plan.name,
          type: plan.type,
          currencyCode: plan.currencyCode,
          priceMinor: plan.priceMinor,
          durationDays: plan.durationDays,
          trialDays: plan.trialDays || 0,
          effectiveFrom: plan.createdAt || new Date(),
          isActive: plan.isActive ?? true,
          gateway: plan.gateway,
          gatewayPlanId: plan.gatewayPlanId,
          changeSummary: 'Backfilled migration to v2 versioned model',
        })
        .returning();

      await db
        .update(subscriptionPlans)
        .set({ currentVersionId: version.id })
        .where(eq(subscriptionPlans.id, plan.id));
    }

    // Backfill vehicle types junction
    if (Array.isArray(plan.vehicleTypeIds) && plan.vehicleTypeIds.length > 0) {
      for (const vehicleTypeId of plan.vehicleTypeIds) {
        if (typeof vehicleTypeId === 'string' && vehicleTypeId.length === 36) {
          await db
            .insert(subscriptionPlanVehicleTypes)
            .values({
              planId: plan.id,
              planVersionId: version.id,
              vehicleTypeId,
            })
            .onConflictDoNothing();
        }
      }
    }

    // Backfill entitlements
    const [existingEntitlement] = await db
      .select()
      .from(subscriptionPlanEntitlements)
      .where(eq(subscriptionPlanEntitlements.planId, plan.id))
      .limit(1);

    if (!existingEntitlement && plan.entitlements) {
      await db.insert(subscriptionPlanEntitlements).values({
        planId: plan.id,
        planVersionId: version.id,
        priorityMatchingBonus: plan.entitlements.priorityScoreBonus ? String(plan.entitlements.priorityScoreBonus) : (plan.priorityMatching ? '0.25' : '0.00'),
        maxRidesPerDay: plan.maxRidesPerDay || null,
        commissionDiscountRate: plan.entitlements.commissionRate != null ? String(plan.entitlements.commissionRate) : null,
        waiveBookingFee: Boolean(plan.entitlements.waiveBookingFee),
        customBookingFeeMinor: plan.entitlements.customBookingFeeMinor != null ? Number(plan.entitlements.customBookingFeeMinor) : null,
        freeInstantPayouts: Boolean(plan.entitlements.freeInstantPayouts),
        supportLevel: plan.entitlements.supportLevel || 'standard',
        customEntitlements: plan.entitlements,
      });
    }

    // Backfill subscriptions referencing this plan to have planVersionId set
    await db
      .update(subscriptions)
      .set({ planVersionId: version.id })
      .where(and(eq(subscriptions.planId, plan.id), isNull(subscriptions.planVersionId)));
  }

  // 2. Backfill Commission Rules & Versions
  const rules = await db.select().from(commissionRules);
  console.log(`📊 Found ${rules.length} commission rules to inspect/migrate`);

  for (const rule of rules) {
    let [ruleVersion] = await db
      .select()
      .from(commissionRuleVersions)
      .where(eq(commissionRuleVersions.ruleId, rule.id))
      .limit(1);

    if (!ruleVersion) {
      console.log(`  ➕ Creating Version 1 for commission rule: "${rule.name}" (${rule.id})`);
      [ruleVersion] = await db
        .insert(commissionRuleVersions)
        .values({
          ruleId: rule.id,
          version: rule.version || 1,
          name: rule.name,
          countryId: rule.countryId,
          cityId: rule.cityId,
          vehicleTypeId: rule.vehicleTypeId,
          serviceTypeId: rule.serviceTypeId || null,
          planTierId: rule.planTierId || null,
          bookingFeeMinor: rule.bookingFeeMinor || 0,
          platformFeeMinor: rule.platformFeeMinor || 0,
          subscriberRate: rule.subscriberRate || '0.0500',
          nonSubscriberRate: rule.nonSubscriberRate || '0.2000',
          commissionBase: rule.commissionBase || 'fare_after_booking_fee',
          minCommissionMinor: rule.minCommissionMinor || 0,
          maxCommissionMinor: rule.maxCommissionMinor || null,
          priority: rule.priority || 1,
          effectiveFrom: rule.effectiveFrom || rule.createdAt || new Date(),
          isActive: rule.isActive ?? true,
          changeSummary: 'Backfilled migration to v2 versioned model',
        })
        .returning();

      await db
        .update(commissionRules)
        .set({ currentVersionId: ruleVersion.id, version: 1 })
        .where(eq(commissionRules.id, rule.id));
    }
  }

  console.log('✅ Commercial Subsystem v2 Data Migration completed successfully!');
}

// Run standalone if invoked directly
if (process.argv[1]?.endsWith('migrate-commercial-v2.js')) {
  migrateCommercialSubsystemV2()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
