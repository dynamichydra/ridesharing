import { pgTable, uuid, varchar, jsonb, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { promos } from './promos.js';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { vehicleTypes } from './vehicle-types.js';
import { airports } from './airports.js';

export const promoRules = pgTable('promo_rules', {
  id:            uuid('id').primaryKey().defaultRandom(),
  promoId:       uuid('promo_id').references(() => promos.id).notNull(),
  cityId:        uuid('city_id').references(() => cities.id),
  zoneId:        uuid('zone_id').references(() => zones.id),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id),
  airportId:     uuid('airport_id').references(() => airports.id),
  ruleType:      varchar('rule_type', { length: 50 }).notNull(), // NEW_USER | PAYMENT_METHOD | MIN_FARE | AIRPORT | ZONE
  ruleValue:     jsonb('rule_value'),
  isActive:      boolean('is_active').default(true).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  promoIndex:   index('promo_rules_promo_idx').on(table.promoId),
  cityIndex:    index('promo_rules_city_idx').on(table.cityId),
  vehicleIndex: index('promo_rules_vehicle_idx').on(table.vehicleTypeId),
  activeIndex:  index('promo_rules_active_idx').on(table.isActive),
}));
