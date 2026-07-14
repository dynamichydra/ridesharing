import { pgTable, uuid, varchar, boolean, timestamp, integer, text } from 'drizzle-orm/pg-core';

// Physical catalog only — Bike/Auto/Cab exist the same way in every country.
// Per-country rates live in vehicle_type_pricing so adding a country never duplicates the catalog.
export const vehicleTypes = pgTable('vehicle_types', {
  id:          uuid('id').primaryKey().defaultRandom(),
  name:        varchar('name', { length: 60 }).notNull(),   // Bike, Auto, Cab — admin-defined
  slug:        varchar('slug', { length: 60 }).unique().notNull(),
  icon:        text('icon'),                                // S3 URL
  capacity:    integer('capacity').default(1),
  sortOrder:   integer('sort_order').default(0),
  isActive:    boolean('is_active').default(true),
  createdBy:   uuid('created_by'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});
