import { pgTable, uuid, varchar, boolean, timestamp, integer, jsonb, text } from 'drizzle-orm/pg-core';
import { states } from './states.js';
import { countries } from './countries.js';
import { cityTypes } from './city-types.js';

export const cities = pgTable('cities', {
  id:         uuid('id').primaryKey().defaultRandom(),
  stateId:    uuid('state_id').references(() => states.id).notNull(),
  countryId:  uuid('country_id').references(() => countries.id).notNull(), // denormalized for fast filtering
  cityTypeId: uuid('city_type_id').references(() => cityTypes.id),        // Tier-1, Tier-2, Rural, Tourist etc.
  name:       varchar('name', { length: 100 }).notNull(),
  timezone:   varchar('timezone', { length: 50 }),
  status:     varchar('status', { length: 20 }).default('ACTIVE'),        // ACTIVE | INACTIVE | DRAFT | ARCHIVED
  polygon:    jsonb('polygon'),                                          // GeoJSON Polygon boundary for operational service area
  hexCells:   text('hex_cells').array(),                                 // Precomputed H3 hexagon cells for fast spatial lookups
  resolution: integer('resolution').default(8),                          // H3 resolution
  isActive:   boolean('is_active').default(true),
  sortOrder:  integer('sort_order').default(0),
  createdBy:  uuid('created_by'),
  createdAt:  timestamp('created_at').defaultNow(),
  updatedAt:  timestamp('updated_at').defaultNow(),
});
