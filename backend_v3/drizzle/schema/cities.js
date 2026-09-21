import { pgTable, uuid, varchar, boolean, timestamp, text, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { states } from './states.js';
import { countries } from './countries.js';

export const cities = pgTable('cities', {
  id: uuid('id').primaryKey().defaultRandom(),
  stateId: uuid('state_id').references(() => states.id),
  countryId: uuid('country_id').references(() => countries.id),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 30 }),
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  currencyCode: varchar('currency_code', { length: 10 }).notNull().default('INR'),
  boundary: text('boundary'), // GeoJSON or PostGIS boundary string
  polygon: jsonb('polygon'), // GeoJSON polygon { type, coordinates }
  hexCells: jsonb('hex_cells').default([]), // Derived H3 cell IDs for fast O(1) lookup
  resolution: integer('resolution').default(8),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true).notNull(),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  stateIndex: index('cities_state_idx').on(table.stateId),
  activeIndex: index('cities_active_idx').on(table.isActive),
  codeIndex: index('cities_code_idx').on(table.code),
}));
