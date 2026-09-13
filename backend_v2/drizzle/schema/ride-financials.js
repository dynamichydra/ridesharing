import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, bigint, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { subscriptions } from './subscriptions.js';
import { subscriptionPlans } from './subscription-plans.js';
import { subscriptionPlanVersions } from './subscription-plan-versions.js';
import { commissionRules } from './commission-rules.js';
import { commissionRuleVersions } from './commission-rule-versions.js';
import { commissionBaseEnum } from './enums.js';

export const rideFinancials = pgTable('ride_financials', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  rideId:                   uuid('ride_id').references(() => rides.id, { onDelete: 'cascade' }).notNull().unique(),
  currencyCode:             varchar('currency_code', { length: 3 }).notNull(),

  // Fare and fee components (in integer minor units / paise / cents)
  grossFareMinor:           bigint('gross_fare_minor', { mode: 'number' }).notNull(),
  bookingFeeMinor:          integer('booking_fee_minor').default(0).notNull(),
  platformFeeMinor:         integer('platform_fee_minor').default(0).notNull(),
  commissionBaseMinor:      bigint('commission_base_minor', { mode: 'number' }).notNull(),
  commissionBase:           commissionBaseEnum('commission_base').default('fare_after_booking_fee').notNull(),

  // Commission details
  commissionRate:           decimal('commission_rate', { precision: 5, scale: 4 }).notNull(),
  commissionMinor:          integer('commission_minor').default(0).notNull(),
  promoDiscountMinor:       integer('promo_discount_minor').default(0).notNull(),
  platformSubsidyMinor:     integer('platform_subsidy_minor').default(0).notNull(),

  // Additional elements
  taxMinor:                 integer('tax_minor').default(0).notNull(),
  tollMinor:                integer('toll_minor').default(0).notNull(),
  tipMinor:                 integer('tip_minor').default(0).notNull(),
  driverEarningMinor:       bigint('driver_earning_minor', { mode: 'number' }).notNull(),
  platformRevenueMinor:     bigint('platform_revenue_minor', { mode: 'number' }).notNull(),
  roundingAdjustmentMinor:  integer('rounding_adjustment_minor').default(0).notNull(),

  // Provenance & Snapshot References
  isSubscriber:             boolean('is_subscriber').default(false).notNull(),
  subscriptionId:           uuid('subscription_id').references(() => subscriptions.id),
  subscriptionPlanId:       uuid('subscription_plan_id').references(() => subscriptionPlans.id),
  subscriptionPlanVersionId: uuid('subscription_plan_version_id').references(() => subscriptionPlanVersions.id),
  subscriptionPlanVersion:  integer('subscription_plan_version'),

  commissionRuleId:         uuid('commission_rule_id').references(() => commissionRules.id),
  commissionRuleVersionId:  uuid('commission_rule_version_id').references(() => commissionRuleVersions.id),
  commissionRuleVersion:    integer('commission_rule_version'),

  // Structured fee breakdown
  breakdown:                jsonb('breakdown'), // normalized fee breakdown items
  idempotencyKey:           varchar('idempotency_key', { length: 128 }).unique(),

  isSettled:                boolean('is_settled').default(false).notNull(),
  calculatedAt:             timestamp('calculated_at').defaultNow().notNull(),
  finalizedAt:              timestamp('finalized_at'),
  settledAt:                timestamp('settled_at'),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  index('ride_financials_ride_idx').on(t.rideId),
  index('ride_financials_subscription_idx').on(t.subscriptionId),
  index('ride_financials_rule_idx').on(t.commissionRuleId),
  index('ride_financials_calculated_at_idx').on(t.calculatedAt),
  index('ride_financials_settled_idx').on(t.isSettled),
]));
