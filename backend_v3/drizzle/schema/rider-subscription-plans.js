import { pgTable, uuid, varchar, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

// Rider-facing membership plans (e.g. ride discounts/perks), parallel to the driver-facing
// subscription_plans table but with no vehicle-type/ride-cap concepts — those are driver-only.
export const riderSubscriptionPlans = pgTable('rider_subscription_plans', {
  id:              uuid('id').primaryKey().defaultRandom(),
  countryId:       uuid('country_id').references(() => countries.id).notNull(), // a plan is a country-specific commercial product
  name:            varchar('name', { length: 100 }).notNull(),
  type:            varchar('type', { length: 50 }).notNull(), // fully dynamic — admin can define any: monthly, quarterly, yearly, lifetime, custom
  currencyCode:    varchar('currency_code', { length: 3 }).notNull(),
  priceMinor:      integer('price_minor').notNull(),
  durationDays:    integer('duration_days'),      // null = lifetime
  trialDays:       integer('trial_days').default(0),
  features:        jsonb('features'),             // string[]
  sortOrder:       integer('sort_order').default(0),
  isActive:        boolean('is_active').default(true),
  gateway:         varchar('gateway', { length: 20 }),        // razorpay | stripe — which provider bills this plan
  gatewayPlanId:   varchar('gateway_plan_id'),                // provider's recurring-plan id
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});
