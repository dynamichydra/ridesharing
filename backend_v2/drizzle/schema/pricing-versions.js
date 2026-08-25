import { pgTable, uuid, integer, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { pricingProfiles } from './pricing-profiles.js';
import { vehicleTypes } from './vehicle-types.js';
import { cities } from './cities.js';
import { zones } from './zones.js';

export const pricingVersions = pgTable('pricing_versions', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  pricingProfileId:        uuid('pricing_profile_id').references(() => pricingProfiles.id),
  vehicleTypeId:           uuid('vehicle_type_id').references(() => vehicleTypes.id),
  cityId:                  uuid('city_id').references(() => cities.id),
  zoneId:                  uuid('zone_id').references(() => zones.id),
  version:                 integer('version').default(1).notNull(),
  baseFareMinor:           integer('base_fare_minor').notNull(),
  minFareMinor:            integer('min_fare_minor').notNull(),
  perKmRateMinor:          integer('per_km_rate_minor').notNull(),
  perMinRateMinor:         integer('per_min_rate_minor').notNull(),
  waitingPricePerMinMinor: integer('waiting_price_per_min_minor').default(0),
  waitingGracePeriodMin:   integer('waiting_grace_period_min').default(3),
  bookingFeeMinor:         integer('booking_fee_minor').default(0),
  serviceFeeMinor:         integer('service_fee_minor').default(0),
  cancellationFeeMinor:    integer('cancellation_fee_minor').default(0),
  noShowFeeMinor:          integer('no_show_fee_minor').default(0),
  surgeFloorMultiplier:    decimal('surge_floor_multiplier', { precision: 4, scale: 2 }).default('1.00'),
  surgeCapMultiplier:      decimal('surge_cap_multiplier', { precision: 4, scale: 2 }).default('3.00'),
  effectiveFrom:           timestamp('effective_from').defaultNow(),
  effectiveTo:             timestamp('effective_to'),
  isActive:                boolean('is_active').default(true),
  createdAt:               timestamp('created_at').defaultNow(),
  updatedAt:               timestamp('updated_at').defaultNow(),
});
