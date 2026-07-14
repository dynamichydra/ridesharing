import { pgTable, uuid, varchar, boolean, timestamp, integer, unique } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { countries } from './countries.js';

// Per-country rate card for a vehicle type. All amounts are integer minor units
// (paise/cents) paired with currencyCode — never bare decimals.
export const vehicleTypePricing = pgTable('vehicle_type_pricing', {
  id:               uuid('id').primaryKey().defaultRandom(),
  vehicleTypeId:    uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  countryId:        uuid('country_id').references(() => countries.id).notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  baseRateMinor:    integer('base_rate_minor').notNull(),
  perKmRateMinor:   integer('per_km_rate_minor').notNull(),
  perMinRateMinor:  integer('per_min_rate_minor').notNull(),
  minFareMinor:     integer('min_fare_minor').default(0),
  isActive:         boolean('is_active').default(true),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
}, (t) => ([
  unique().on(t.vehicleTypeId, t.countryId),
]));
