import { pgTable, uuid, varchar, timestamp, decimal, integer, text, smallint, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { drivers } from './drivers.js';
import { vehicleTypes } from './vehicle-types.js';
import { countries } from './countries.js';
import { vehicleTypePricing } from './vehicle-type-pricing.js';

export const rides = pgTable('rides', {
  id:             uuid('id').primaryKey().defaultRandom(),
  riderId:        uuid('rider_id').references(() => users.id).notNull(),
  driverId:       uuid('driver_id').references(() => drivers.id),
  vehicleTypeId:  uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  countryId:      uuid('country_id').references(() => countries.id),  // resolved from pickup point at request time
  currencyCode:   varchar('currency_code', { length: 3 }),
  pickupLat:      decimal('pickup_lat', { precision: 10, scale: 8 }).notNull(),
  pickupLng:      decimal('pickup_lng', { precision: 11, scale: 8 }).notNull(),
  pickupAddress:  text('pickup_address'),
  dropLat:        decimal('drop_lat', { precision: 10, scale: 8 }).notNull(),
  dropLng:        decimal('drop_lng', { precision: 11, scale: 8 }).notNull(),
  dropAddress:    text('drop_address'),
  fareSnapshot:   jsonb('fare_snapshot'),         // full breakdown stored at ride time
  ratePricingId:  uuid('rate_pricing_id').references(() => vehicleTypePricing.id), // exact rate-card row/version resolved at request time — traceable even after the card is later superseded
  appliedFareRuleIds: text('applied_fare_rule_ids').array(), // fare_rules ids applied at request time (surge/zone/time/traffic)
  estimatedFareMinor: integer('estimated_fare_minor'),
  finalFareMinor:     integer('final_fare_minor'),
  distanceKm:     decimal('distance_km',    { precision: 8, scale: 3 }),
  durationMin:    integer('duration_min'),
  actualDistanceKm:       decimal('actual_distance_km', { precision: 8, scale: 3 }), // GPS-derived, from trip_gps_pings
  actualDurationMin:      integer('actual_duration_min'),
  gpsPingCount:           integer('gps_ping_count'),
  gpsNoiseRejectedCount:  integer('gps_noise_rejected_count'),
  polyline:       text('polyline'),               // encoded Google route
  status:         varchar('status').default('requested'),
  // requested | searching | accepted | arriving | started | completed | cancelled | expired
  paymentMethod:  varchar('payment_method', { length: 10 }),   // online | cash — set once a payment action is taken
  paymentStatus:  varchar('payment_status', { length: 20 }).default('pending'),
  // pending | processing | paid | failed
  cancelledBy:    varchar('cancelled_by'),        // rider | driver | system
  cancelReason:   text('cancel_reason'),
  riderRating:    smallint('rider_rating'),       // driver rates rider
  driverRating:   smallint('driver_rating'),      // rider rates driver
  riderReview:    text('rider_review'),
  driverReview:   text('driver_review'),
  requestedAt:    timestamp('requested_at').defaultNow(),
  acceptedAt:     timestamp('accepted_at'),
  startedAt:      timestamp('started_at'),
  completedAt:    timestamp('completed_at'),
  cancelledAt:    timestamp('cancelled_at'),
});
