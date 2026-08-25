import { pgTable, uuid, varchar, boolean, timestamp, integer, text } from 'drizzle-orm/pg-core';

// Catalog + rate, both global — one flat rate per vehicle type, same in every country. No
// per-country rate cards (that used to live in vehicle_type_pricing; removed as unneeded
// complexity). Amounts are integer minor units (paise/cents), interpreted in whichever
// country's currency a given ride resolves to — see fare.service.js#calculateFare.
export const vehicleTypes = pgTable('vehicle_types', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 60 }).notNull(),   // Bike, Auto, Cab — admin-defined
  slug:        varchar('slug', { length: 60 }).unique().notNull(),
  icon:        text('icon'),                                // S3 URL
  capacity:    integer('capacity').default(1),
  sortOrder:   integer('sort_order').default(0),
  baseRateMinor:   integer('base_rate_minor').notNull().default(0),
  perKmRateMinor:  integer('per_km_rate_minor').notNull().default(0),
  perMinRateMinor: integer('per_min_rate_minor').notNull().default(0),
  minFareMinor:    integer('min_fare_minor').notNull().default(0),
  isActive:    boolean('is_active').default(true),
  createdBy:   uuid('created_by'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});
