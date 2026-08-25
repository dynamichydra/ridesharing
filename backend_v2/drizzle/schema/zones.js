import { pgTable, uuid, varchar, boolean, timestamp, decimal, jsonb, text, integer } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { cities } from './cities.js';

export const zones = pgTable('zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  countryId: uuid('country_id').references(() => countries.id).notNull(),
  cityId: uuid('city_id').references(() => cities.id),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 30 }).notNull(),   // city | large_city | suburb | airport | highway | metro | surge | restricted | custom
  polygon: jsonb('polygon').notNull(),                  // GeoJSON polygon { type, coordinates } — source of truth for hexCells
  hexCells: text('hex_cells').array(),                   // H3 cell IDs at `resolution`, derived from polygon
  resolution: integer('resolution'),                       // H3 resolution used to generate hexCells; null = not yet generated
  priority: integer('priority').default(1),              // overlap precedence when a point matches >1 zone (higher wins)
  multiplier: decimal('multiplier', { precision: 4, scale: 2 }).default('1.00'),
  airportFeeMinor: integer('airport_fee_minor').default(0),     // special fee for airport pickup/dropoff
  pickupFeeMinor: integer('pickup_fee_minor').default(0),      // special pickup surcharge
  dropoffFeeMinor: integer('dropoff_fee_minor').default(0),     // special dropoff surcharge
  description: varchar('description', { length: 255 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
