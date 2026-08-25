import { pgTable, uuid, varchar, boolean, timestamp, jsonb, text, integer } from 'drizzle-orm/pg-core';
import { cities } from './cities.js';
import { countries } from './countries.js';

export const cityServiceAreas = pgTable('city_service_areas', {
  id:          uuid('id').primaryKey().defaultRandom(),
  cityId:      uuid('city_id').references(() => cities.id).notNull(),
  countryId:   uuid('country_id').references(() => countries.id),
  name:        varchar('name', { length: 150 }).notNull(),
  status:      varchar('status', { length: 30 }).default('ACTIVE').notNull(), // ACTIVE | INACTIVE | RESTRICTED
  polygon:     jsonb('polygon').notNull(),                   // GeoJSON polygon { type, coordinates }
  hexCells:    text('hex_cells').array(),                    // Derived H3 cell IDs for fast O(1) lookup
  resolution:  integer('resolution'),                        // H3 resolution used
  isActive:    boolean('is_active').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});
