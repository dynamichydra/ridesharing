import { pgTable, uuid, varchar, text, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { cities } from './cities.js';
import { zones } from './zones.js';

export const airports = pgTable('airports', {
  id:            uuid('id').primaryKey().defaultRandom(),
  cityId:        uuid('city_id').references(() => cities.id).notNull(),
  zoneId:        uuid('zone_id').references(() => zones.id),
  name:          varchar('name', { length: 150 }).notNull(),
  code:          varchar('code', { length: 10 }).notNull(), // IATA Code (e.g. DEL, BOM, CCU)
  boundary:      text('boundary'),
  pickupEnabled: boolean('pickup_enabled').default(true).notNull(),
  dropEnabled:   boolean('drop_enabled').default(true).notNull(),
  isActive:      boolean('is_active').default(true).notNull(),
  createdAt:     timestamp('created_at').defaultNow().notNull(),
  updatedAt:     timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  cityIndex:      index('airports_city_idx').on(table.cityId),
  zoneIndex:      index('airports_zone_idx').on(table.zoneId),
  cityCodeUnique: uniqueIndex('airports_city_code_unique').on(table.cityId, table.code),
  activeIndex:    index('airports_active_idx').on(table.isActive),
}));
