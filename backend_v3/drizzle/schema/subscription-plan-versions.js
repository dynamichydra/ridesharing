import { pgTable, uuid, varchar, boolean, timestamp, integer, bigint, index, unique } from 'drizzle-orm/pg-core';
import { subscriptionPlans } from './subscription-plans.js';
import { admins } from './admins.js';

export const subscriptionPlanVersions = pgTable('subscription_plan_versions', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  planId:             uuid('plan_id').references(() => subscriptionPlans.id, { onDelete: 'cascade' }).notNull(),
  version:            integer('version').default(1).notNull(),
  name:               varchar('name', { length: 100 }).notNull(),
  type:               varchar('type', { length: 50 }).notNull(), // monthly, quarterly, yearly, lifetime, custom
  currencyCode:       varchar('currency_code', { length: 3 }).notNull(),
  priceMinor:         bigint('price_minor', { mode: 'number' }).notNull(),
  durationDays:       integer('duration_days'), // null = lifetime
  trialDays:          integer('trial_days').default(0).notNull(),
  effectiveFrom:      timestamp('effective_from').defaultNow().notNull(),
  effectiveTo:        timestamp('effective_to'), // null = indefinite / current active
  isActive:           boolean('is_active').default(true).notNull(),
  gateway:            varchar('gateway', { length: 20 }),
  gatewayPlanId:      varchar('gateway_plan_id'),
  changeSummary:      varchar('change_summary', { length: 255 }),
  createdByAdminId:   uuid('created_by_admin_id').references(() => admins.id),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  unique('sub_plan_version_uniq').on(t.planId, t.version),
  index('sub_plan_versions_plan_active_idx').on(t.planId, t.isActive),
  index('sub_plan_versions_effective_idx').on(t.planId, t.effectiveFrom, t.effectiveTo),
]));
