import { pgTable, uuid, varchar, boolean, timestamp, decimal } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { states } from './states.js';
import { cities } from './cities.js';

// Kept simple (flat rate, exclusive/inclusive) — provincial/city-level tax
// stacking is modelled as separate active rows.
export const taxRules = pgTable('tax_rules', {
  id:          uuid('id').primaryKey().defaultRandom(),
  countryId:   uuid('country_id').references(() => countries.id).notNull(),
  stateId:     uuid('state_id').references(() => states.id),   // null = applies to whole country
  cityId:      uuid('city_id').references(() => cities.id),     // null = applies to whole state or country
  name:        varchar('name', { length: 60 }).notNull(),      // "GST", "HST", "City Transport Cess"
  appliesTo:   varchar('applies_to', { length: 20 }).notNull(), // fare | subscription | both
  rate:        decimal('rate', { precision: 6, scale: 4 }).notNull(), // 0.1300 = 13%
  isInclusive: boolean('is_inclusive').default(false),          // true = rate already baked into the price
  isActive:    boolean('is_active').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});
