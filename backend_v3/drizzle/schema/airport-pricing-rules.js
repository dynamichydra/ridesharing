import { pgTable, uuid, varchar, numeric, boolean, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { airportDirectionEnum, valueTypeEnum } from './enums.js';
import { airports } from './airports.js';
import { vehicleTypes } from './vehicle-types.js';

export const airportPricingRules = pgTable('airport_pricing_rules', {
  id:            uuid('id').primaryKey().defaultRandom(),
  airportId:     uuid('airport_id').references(() => airports.id).notNull(),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  direction:     airportDirectionEnum('direction').notNull().default('both'),
  ruleType:      varchar('rule_type', { length: 50 }).notNull().default('AIRPORT_SURCHARGE'),
  valueType:     valueTypeEnum('value_type').notNull().default('fixed'),
  value:         numeric('value', { precision: 12, scale: 4 }).notNull(),
  priority:      integer('priority').notNull().default(0),
  effectiveFrom: timestamp('effective_from'),
  effectiveTo:   timestamp('effective_to'),
  metadata:      jsonb('metadata'),
  isActive:      boolean('is_active').default(true).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  airportVehicleIndex: index('airport_pricing_airport_vehicle_idx').on(table.airportId, table.vehicleTypeId),
  activeIndex:         index('airport_pricing_active_idx').on(table.isActive),
}));
