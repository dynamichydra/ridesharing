import { pgTable, uuid, boolean, timestamp, integer, decimal, varchar, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { subscriptionPlanVersions } from './subscription-plan-versions.js';
import { subscriptionPlans } from './subscription-plans.js';

export const subscriptionPlanEntitlements = pgTable('subscription_plan_entitlements', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  planId:                 uuid('plan_id').references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  planVersionId:          uuid('plan_version_id').references(() => subscriptionPlanVersions.id, { onDelete: 'cascade' }),
  priorityMatchingBonus:  decimal('priority_matching_bonus', { precision: 5, scale: 2 }).default('0.00'), // e.g. 0.25 bonus score
  maxRidesPerDay:         integer('max_rides_per_day'), // null = unlimited
  commissionDiscountRate: decimal('commission_discount_rate', { precision: 5, scale: 4 }), // custom subscriber rate override, e.g. 0.0500
  waiveBookingFee:        boolean('waive_booking_fee').default(false).notNull(),
  customBookingFeeMinor:  integer('custom_booking_fee_minor'), // if custom flat fee overrides rule
  freeInstantPayouts:     boolean('free_instant_payouts').default(false).notNull(),
  scheduledRidesAllowed:  boolean('scheduled_rides_allowed').default(true).notNull(),
  supportLevel:           varchar('support_level', { length: 30 }).default('standard'), // standard | priority | dedicated
  customEntitlements:     jsonb('custom_entitlements'), // extensible metadata
  createdAt:              timestamp('created_at').defaultNow().notNull(),
  updatedAt:              timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  unique('sub_plan_entitlements_version_uniq').on(t.planVersionId),
  index('sub_plan_entitlements_plan_idx').on(t.planId),
]));
