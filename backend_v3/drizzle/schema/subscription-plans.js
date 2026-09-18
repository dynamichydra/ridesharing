import { pgTable, uuid, varchar, boolean, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const subscriptionPlans = pgTable('subscription_plans', {
  id:               uuid('id').primaryKey().defaultRandom(),
  countryId:        uuid('country_id').references(() => countries.id).notNull(), // country-scoped commercial product
  code:             varchar('code', { length: 50 }),
  name:             varchar('name', { length: 100 }).notNull(),
  description:      varchar('description', { length: 255 }),
  // type is fully dynamic: monthly, quarterly, yearly, lifetime, custom
  type:             varchar('type', { length: 50 }).notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  priceMinor:       integer('price_minor').notNull(),
  durationDays:     integer('duration_days'),      // null = lifetime
  trialDays:        integer('trial_days').default(0),
  features:         jsonb('features'),             // string[]
  vehicleTypeIds:   jsonb('vehicle_type_ids'),     // uuid[] (backward compatibility - normalized into subscription_plan_vehicle_types)
  maxRidesPerDay:   integer('max_rides_per_day'),  // null = unlimited
  priorityMatching: boolean('priority_matching').default(false), // boosts scoring
  entitlements:     jsonb('entitlements'),         // dynamic key-value capabilities (backward compatibility)
  allowedGroupIds:  jsonb('allowed_group_ids'),    // uuid[] of driver_groups — null = all drivers
  currentVersionId: uuid('current_version_id'),    // pointer to active subscription_plan_versions row
  sortOrder:        integer('sort_order').default(0),
  isActive:         boolean('is_active').default(true),
  archivedAt:       timestamp('archived_at'),
  gateway:          varchar('gateway', { length: 20 }),        // razorpay | stripe
  gatewayPlanId:    varchar('gateway_plan_id'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
}, (t) => ([
  index('sub_plans_country_active_idx').on(t.countryId, t.isActive),
  index('sub_plans_sort_order_idx').on(t.sortOrder),
]));
