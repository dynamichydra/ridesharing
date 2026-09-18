import { pgTable, uuid, varchar, integer, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { directionEnum } from './enums.js';
import { cities } from './cities.js';
import { zones } from './zones.js';

export const tollRules = pgTable('toll_rules', {
  id:         uuid('id').primaryKey().defaultRandom(),
  cityId:     uuid('city_id').references(() => cities.id).notNull(),
  fromZoneId: uuid('from_zone_id').references(() => zones.id),
  toZoneId:   uuid('to_zone_id').references(() => zones.id),
  name:       varchar('name', { length: 150 }).notNull(),
  amount:     integer('amount').notNull(), // minor currency units
  direction:  directionEnum('direction').notNull().default('both'),
  metadata:   jsonb('metadata'),
  isActive:   boolean('is_active').default(true).notNull(),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
  updatedAt:  timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  cityIndex:   index('toll_rules_city_idx').on(table.cityId),
  zoneIndex:   index('toll_rules_zone_idx').on(table.fromZoneId, table.toZoneId),
  activeIndex: index('toll_rules_active_idx').on(table.isActive),
}));
