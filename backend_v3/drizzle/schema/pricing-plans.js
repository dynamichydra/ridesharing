import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { pricingScopeEnum } from './enums.js';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { vehicleTypes } from './vehicle-types.js';

export const pricingPlans = pgTable('pricing_plans', {
  id:            uuid('id').primaryKey().defaultRandom(),
  cityId:        uuid('city_id').references(() => cities.id).notNull(),
  zoneId:        uuid('zone_id').references(() => zones.id), // NULL = city-wide pricing, NOT NULL = zone-specific pricing
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  scope:         pricingScopeEnum('scope').notNull().default('city'),
  name:          varchar('name', { length: 150 }).notNull(),
  currencyCode:  varchar('currency_code', { length: 10 }).notNull().default('INR'),
  isActive:      boolean('is_active').default(true).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  cityVehicleIndex: index('pricing_plans_city_vehicle_idx').on(table.cityId, table.vehicleTypeId),
  zoneVehicleIndex: index('pricing_plans_zone_vehicle_idx').on(table.zoneId, table.vehicleTypeId),
  activeIndex:      index('pricing_plans_active_idx').on(table.isActive),
}));
