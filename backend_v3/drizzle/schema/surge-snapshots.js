import { pgTable, uuid, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { vehicleTypes } from './vehicle-types.js';

export const surgeSnapshots = pgTable('surge_snapshots', {
  id:                uuid('id').primaryKey().defaultRandom(),
  cityId:            uuid('city_id').references(() => cities.id).notNull(),
  zoneId:            uuid('zone_id').references(() => zones.id),
  vehicleTypeId:     uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  demand:            integer('demand').notNull(),
  supply:            integer('supply').notNull(),
  demandSupplyRatio: numeric('demand_supply_ratio', { precision: 12, scale: 4 }).notNull(),
  multiplier:        numeric('multiplier', { precision: 8, scale: 4 }).notNull(),
  calculatedAt:      timestamp('calculated_at').defaultNow().notNull(),
  expiresAt:         timestamp('expires_at').notNull(),
}, (table) => ({
  lookupIndex: index('surge_snapshots_lookup_idx').on(table.cityId, table.zoneId, table.vehicleTypeId, table.calculatedAt),
}));
