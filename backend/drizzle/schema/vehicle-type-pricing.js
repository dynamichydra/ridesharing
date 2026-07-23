import { pgTable, uuid, varchar, boolean, timestamp, integer, unique } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { countries } from './countries.js';

// Per-country rate card for a vehicle type. All amounts are integer minor units
// (paise/cents) paired with currencyCode — never bare decimals.
//
// Versioned: an update never mutates a row in place — it sets the current active
// row's effectiveTo=now/isActive=false and inserts a new row with version+1 (see
// vehicle-type-pricing.service.js). This lets a disputed historical trip be
// recalculated with the rate card that was actually active at ride-request time,
// not whatever the card has since been changed to.
//
// fuelType is nullable — a category-level rate card (fuelType null) is the
// fallback when no fuel-specific card exists for this vehicleType+country+fuelType.
// NOTE: calculateFare() currently always resolves with fuelType=null, since the
// specific vehicle (and its fuel type) isn't known until after driver matching —
// this column is schema-ready for a future rider-facing fuel/EV selection feature,
// not yet reachable from the live quote flow.
export const vehicleTypePricing = pgTable('vehicle_type_pricing', {
  id:               uuid('id').primaryKey().defaultRandom(),
  vehicleTypeId:    uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  countryId:        uuid('country_id').references(() => countries.id).notNull(),
  fuelType:         varchar('fuel_type', { length: 20 }),   // petrol | diesel | electric | hybrid | cng | null (category-level)
  version:          integer('version').notNull().default(1),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  baseRateMinor:    integer('base_rate_minor').notNull(),
  perKmRateMinor:   integer('per_km_rate_minor').notNull(),
  perMinRateMinor:  integer('per_min_rate_minor').notNull(),
  minFareMinor:     integer('min_fare_minor').default(0),
  isActive:         boolean('is_active').default(true),
  effectiveFrom:    timestamp('effective_from').defaultNow().notNull(),
  effectiveTo:      timestamp('effective_to'),          // null = currently active (or not yet superseded)
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
}, (t) => ([
  // Replaces the old unique(vehicleTypeId, countryId) — that constraint would
  // reject every second version of a pricing row. Versioning requires multiple
  // historical rows per (vehicleTypeId, countryId, fuelType) to coexist.
  unique().on(t.vehicleTypeId, t.countryId, t.fuelType, t.version),
]));
