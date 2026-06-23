import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, text } from 'drizzle-orm/pg-core';

export const vehicleTypes = pgTable('vehicle_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 60 }).notNull(),   // Bike, Auto, Cab — admin-defined
  slug: varchar('slug', { length: 60 }).unique().notNull(),
  icon: text('icon'),                                // S3 URL
  capacity: integer('capacity').default(1),
  baseRate: decimal('base_rate', { precision: 10, scale: 2 }).notNull(),
  perKmRate: decimal('per_km_rate', { precision: 10, scale: 2 }).notNull(),
  perMinRate: decimal('per_min_rate', { precision: 10, scale: 2 }).notNull(),
  minFare: decimal('min_fare', { precision: 10, scale: 2 }).default('0'),
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
