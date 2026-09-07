import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { countries } from './countries.js';
import { cities } from './cities.js';

// Admin-configurable per-ride commission, supporting city, country, and vehicle-type scoping.
// Resolved with a 5-tier fallback hierarchy:
// 1. City + Vehicle Type (Exact)
// 2. City Default (vehicleTypeId null)
// 3. Country + Vehicle Type
// 4. Country Default (vehicleTypeId null)
// 5. Global Default (both null)
// A driver's active subscription discount uses subscriberRate vs nonSubscriberRate at settlement time.
export const commissionRules = pgTable('commission_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  countryId: uuid('country_id').references(() => countries.id),         // null = global default
  cityId: uuid('city_id').references(() => cities.id),               // null = country-wide or global default
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id), // null = all types
  bookingFeeMinor: integer('booking_fee_minor').notNull().default(0), // flat fee taken off the top before % split (100% platform)
  subscriberRate: decimal('subscriber_rate', { precision: 5, scale: 4 }).notNull(),    // e.g. 0.1500 = 15%
  nonSubscriberRate: decimal('non_subscriber_rate', { precision: 5, scale: 4 }).notNull(), // e.g. 0.2500 = 25%
  minCommissionMinor: integer('min_commission_minor').default(0),        // floor: minimum platform cut on any trip
  maxCommissionMinor: integer('max_commission_minor'),                   // cap: ceiling on platform cut (e.g. outstation/airport)
  isActive: boolean('is_active').default(true),
  priority: integer('priority').default(1), // higher wins when more than one row matches at the same tier
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

