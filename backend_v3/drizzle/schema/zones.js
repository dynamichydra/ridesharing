import { pgTable, uuid, varchar, boolean, timestamp, text, integer, decimal, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { cities } from './cities.js';
import { countries } from './countries.js';

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  cityId: uuid('city_id').references(() => cities.id).notNull(),
  countryId: uuid('country_id').references(() => countries.id),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 30 }).notNull(),
  boundary: text('boundary'), // GeoJSON or polygon boundary text
  polygon: jsonb('polygon'), // GeoJSON polygon geometry
  type: varchar('type', { length: 50 }).default('standard'),
  hexCells: jsonb('hex_cells').default([]), // H3 hex cell IDs
  resolution: integer('resolution').default(8),
  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  cityIndex: index('zones_city_idx').on(table.cityId),
  cityCodeUnique: uniqueIndex('zones_city_code_unique').on(table.cityId, table.code),
  activeIndex: index('zones_active_idx').on(table.isActive),
}));
