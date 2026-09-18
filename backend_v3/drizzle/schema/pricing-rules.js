import { pgTable, uuid, varchar, numeric, integer, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { valueTypeEnum } from './enums.js';
import { pricingPlans } from './pricing-plans.js';
import { pricingPlanVersions } from './pricing-plan-versions.js';

export const pricingRules = pgTable('pricing_rules', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  pricingPlanId:        uuid('pricing_plan_id').references(() => pricingPlans.id).notNull(),
  pricingPlanVersionId: uuid('pricing_plan_version_id').references(() => pricingPlanVersions.id),
  ruleCode:             varchar('rule_code', { length: 50 }).notNull(), // ZONE_SURCHARGE | NIGHT_SURCHARGE | PEAK_SURCHARGE | EVENT_SURCHARGE
  name:                 varchar('name', { length: 150 }).notNull(),
  valueType:            valueTypeEnum('value_type').notNull().default('multiplier'),
  value:                numeric('value', { precision: 12, scale: 4 }).notNull(),
  priority:             integer('priority').notNull().default(0),
  effectiveFrom:        timestamp('effective_from'),
  effectiveTo:          timestamp('effective_to'),
  isActive:             boolean('is_active').default(true).notNull(),
  metadata:             jsonb('metadata'),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  planIndex:   index('pricing_rules_plan_idx').on(table.pricingPlanId),
  codeIndex:   index('pricing_rules_code_idx').on(table.ruleCode),
  activeIndex: index('pricing_rules_active_idx').on(table.isActive),
}));
