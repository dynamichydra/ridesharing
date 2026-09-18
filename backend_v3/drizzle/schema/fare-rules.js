import { pgTable, uuid, varchar, boolean, timestamp, numeric, integer, time, jsonb, index } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { zones } from './zones.js';
import { cities } from './cities.js';
import { countries } from './countries.js';
import { pricingPlans } from './pricing-plans.js';
import { pricingPlanVersions } from './pricing-plan-versions.js';
import { valueTypeEnum } from './enums.js';

export const fareRules = pgTable('fare_rules', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  pricingPlanId:        uuid('pricing_plan_id').references(() => pricingPlans.id),
  pricingPlanVersionId: uuid('pricing_plan_version_id').references(() => pricingPlanVersions.id),
  countryId:            uuid('country_id').references(() => countries.id),
  cityId:               uuid('city_id').references(() => cities.id),
  zoneId:               uuid('zone_id').references(() => zones.id),
  vehicleTypeId:        uuid('vehicle_type_id').references(() => vehicleTypes.id),
  ruleCode:             varchar('rule_code', { length: 50 }).notNull().default('CUSTOM_RULE'),
  name:                 varchar('name', { length: 150 }).notNull(),
  ruleType:             varchar('rule_type', { length: 50 }).notNull(), // time | traffic | zone | demand | custom
  valueType:            valueTypeEnum('value_type').default('multiplier').notNull(),
  value:                numeric('value', { precision: 12, scale: 4 }).notNull().default('1.0000'),
  startTime:            time('start_time'),
  endTime:              time('end_time'),
  daysOfWeek:           integer('days_of_week').array(),
  trafficDelayS:        integer('traffic_delay_s'),
  multiplier:           numeric('multiplier', { precision: 5, scale: 2 }),
  flatFareMinor:        integer('flat_fare_minor'),
  allowedVehicleTypeIds: uuid('allowed_vehicle_type_ids').array(),
  priority:             integer('priority').default(0).notNull(),
  effectiveFrom:        timestamp('effective_from'),
  effectiveTo:          timestamp('effective_to'),
  metadata:             jsonb('metadata'),
  isActive:             boolean('is_active').default(true).notNull(),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  planIndex:   index('fare_rules_plan_idx').on(table.pricingPlanId),
  codeIndex:   index('fare_rules_code_idx').on(table.ruleCode),
  zoneIndex:   index('fare_rules_zone_idx').on(table.zoneId),
  activeIndex: index('fare_rules_active_idx').on(table.isActive),
}));
