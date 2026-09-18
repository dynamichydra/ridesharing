import { pgTable, uuid, numeric, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { surgeModeEnum } from './enums.js';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { vehicleTypes } from './vehicle-types.js';

export const surgeRules = pgTable('surge_rules', {
  id:            uuid('id').primaryKey().defaultRandom(),
  cityId:        uuid('city_id').references(() => cities.id).notNull(),
  zoneId:        uuid('zone_id').references(() => zones.id),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  mode:          surgeModeEnum('mode').notNull().default('ratio'),
  minRatio:      numeric('min_ratio', { precision: 8, scale: 4 }), // demand/supply ratio threshold
  maxRatio:      numeric('max_ratio', { precision: 8, scale: 4 }),
  multiplier:    numeric('multiplier', { precision: 8, scale: 4 }).notNull(), // e.g. 1.20 = +20%
  priority:      integer('priority').notNull().default(0),
  effectiveFrom: timestamp('effective_from'),
  effectiveTo:   timestamp('effective_to'),
  isActive:      boolean('is_active').default(true).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  cityZoneVehicleIndex: index('surge_rules_city_zone_vehicle_idx').on(table.cityId, table.zoneId, table.vehicleTypeId),
  activeIndex:          index('surge_rules_active_idx').on(table.isActive),
}));
