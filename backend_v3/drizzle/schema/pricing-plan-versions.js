import { pgTable, uuid, integer, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { pricingPlans } from './pricing-plans.js';

export const pricingPlanVersions = pgTable('pricing_plan_versions', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  pricingPlanId:      uuid('pricing_plan_id').references(() => pricingPlans.id).notNull(),
  version:            integer('version').notNull().default(1),
  baseFare:           integer('base_fare').notNull(), // minor currency units (paise/cents)
  minimumFare:        integer('minimum_fare').notNull(),
  distanceRate:       integer('distance_rate').notNull(), // per km rate in minor units
  timeRate:           integer('time_rate').notNull(), // per min rate in minor units
  bookingFee:         integer('booking_fee').default(0).notNull(),
  platformFee:        integer('platform_fee').default(0).notNull(),
  freeWaitingMinutes: integer('free_waiting_minutes').default(0).notNull(),
  waitingRate:        integer('waiting_rate').default(0).notNull(),
  cancellationFee:    integer('cancellation_fee').default(0).notNull(),
  effectiveFrom:      timestamp('effective_from').defaultNow().notNull(),
  effectiveTo:        timestamp('effective_to'),
  isActive:           boolean('is_active').default(true).notNull(),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  planVersionUnique:  uniqueIndex('pricing_plan_versions_unique').on(table.pricingPlanId, table.version),
  activeVersionIndex: index('pricing_plan_versions_active_idx').on(table.pricingPlanId, table.isActive, table.effectiveFrom),
}));
