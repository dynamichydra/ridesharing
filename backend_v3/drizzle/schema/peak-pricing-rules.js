import { pgTable, uuid, varchar, numeric, time, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { valueTypeEnum } from './enums.js';
import { pricingPlans } from './pricing-plans.js';
import { vehicleTypes } from './vehicle-types.js';

export const peakPricingRules = pgTable('peak_pricing_rules', {
  id:            uuid('id').primaryKey().defaultRandom(),
  pricingPlanId: uuid('pricing_plan_id').references(() => pricingPlans.id).notNull(),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  name:          varchar('name', { length: 100 }).notNull(),
  startTime:     time('start_time').notNull(),
  endTime:       time('end_time').notNull(),
  daysOfWeek:    integer('days_of_week').array(),
  ruleType:      varchar('rule_type', { length: 50 }).notNull().default('PEAK_SURCHARGE'),
  valueType:     valueTypeEnum('value_type').notNull().default('multiplier'),
  value:         numeric('value', { precision: 12, scale: 4 }).notNull(),
  priority:      integer('priority').notNull().default(0),
  effectiveFrom: timestamp('effective_from'),
  effectiveTo:   timestamp('effective_to'),
  isActive:      boolean('is_active').default(true).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  pricingPlanIndex: index('peak_pricing_plan_idx').on(table.pricingPlanId),
  activeIndex:      index('peak_pricing_active_idx').on(table.isActive),
}));
