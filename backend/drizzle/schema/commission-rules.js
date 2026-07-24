import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { countries } from './countries.js';

// Admin-configurable per-ride commission, mirroring fare-rules.js's country/vehicleType
// scoping. Resolved with the same exact -> category -> global fallback tier that
// vehicle-type-pricing.service.js's resolveRateCard already uses for fare rate cards —
// see commission.service.js's resolveCommissionRule. A driver's current
// drivers.subscriptionStatus picks subscriberRate vs nonSubscriberRate at settlement time;
// subscription is a discount on the commission, not a waiver of it.
export const commissionRules = pgTable('commission_rules', {
  id:                uuid('id').primaryKey().defaultRandom(),
  name:              varchar('name', { length: 100 }).notNull(),
  countryId:         uuid('country_id').references(() => countries.id),         // null = global default
  vehicleTypeId:     uuid('vehicle_type_id').references(() => vehicleTypes.id), // null = all types
  bookingFeeMinor:   integer('booking_fee_minor').notNull().default(0), // flat fee taken off the top before the % split, platform keeps 100% of this
  subscriberRate:    decimal('subscriber_rate', { precision: 5, scale: 4 }).notNull(),    // e.g. 0.1500 = 15%
  nonSubscriberRate: decimal('non_subscriber_rate', { precision: 5, scale: 4 }).notNull(), // e.g. 0.2500 = 25%
  isActive:          boolean('is_active').default(true),
  priority:          integer('priority').default(1), // higher wins when more than one row matches the same country+vehicleType
  createdAt:         timestamp('created_at').defaultNow(),
  updatedAt:         timestamp('updated_at').defaultNow(),
});
