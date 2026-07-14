import { pgTable, uuid, varchar, boolean, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const subscriptionPlans = pgTable('subscription_plans', {
  id:              uuid('id').primaryKey().defaultRandom(),
  countryId:       uuid('country_id').references(() => countries.id).notNull(), // a plan is a country-specific commercial product
  name:            varchar('name', { length: 100 }).notNull(),
  // type is fully dynamic — admin can define any: monthly, quarterly, yearly, lifetime, custom
  type:            varchar('type', { length: 50 }).notNull(),
  currencyCode:    varchar('currency_code', { length: 3 }).notNull(),
  priceMinor:      integer('price_minor').notNull(),
  durationDays:    integer('duration_days'),      // null = lifetime
  trialDays:       integer('trial_days').default(0),
  features:        jsonb('features'),             // string[]
  vehicleTypeIds:  jsonb('vehicle_type_ids'),     // uuid[] — which vehicle types this plan allows
  maxRidesPerDay:  integer('max_rides_per_day'),  // null = unlimited
  sortOrder:       integer('sort_order').default(0),
  isActive:        boolean('is_active').default(true),
  gateway:         varchar('gateway', { length: 20 }),        // razorpay | stripe — which provider bills this plan
  gatewayPlanId:   varchar('gateway_plan_id'),                // provider's recurring-plan id
  createdAt:       timestamp('created_at').defaultNow(),
  updatedAt:       timestamp('updated_at').defaultNow(),
});
