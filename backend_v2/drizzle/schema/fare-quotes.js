import { pgTable, uuid, decimal, integer, text, jsonb, timestamp, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { vehicleTypes } from './vehicle-types.js';
import { pricingVersions } from './pricing-versions.js';

export const fareQuotes = pgTable('fare_quotes', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  riderId:             uuid('rider_id').references(() => users.id),
  vehicleTypeId:       uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  pricingVersionId:    uuid('pricing_version_id').references(() => pricingVersions.id),
  pickupLat:           decimal('pickup_lat', { precision: 10, scale: 8 }).notNull(),
  pickupLng:           decimal('pickup_lng', { precision: 11, scale: 8 }).notNull(),
  dropLat:             decimal('drop_lat', { precision: 10, scale: 8 }).notNull(),
  dropLng:             decimal('drop_lng', { precision: 11, scale: 8 }).notNull(),
  distanceKm:          decimal('distance_km', { precision: 8, scale: 3 }).notNull(),
  durationMin:         integer('duration_min').notNull(),
  durationInTrafficMin: integer('duration_in_traffic_min').notNull(),
  surgeMultiplier:     decimal('surge_multiplier', { precision: 5, scale: 2 }).default('1.00').notNull(),
  estimatedFareMinor:  integer('estimated_fare_minor').notNull(),
  discountAmountMinor: integer('discount_amount_minor').default(0).notNull(),
  finalFareMinor:      integer('final_fare_minor').notNull(),
  currencyCode:        varchar('currency_code', { length: 10 }).notNull(),
  polyline:            text('polyline'),
  breakdown:           jsonb('breakdown').notNull(),
  appliedFareRuleIds:  text('applied_fare_rule_ids').array(),
  status:              varchar('status', { length: 30 }).default('QUOTED').notNull(), // QUOTED | BOOKED | EXPIRED | RECALCULATED
  expiresAt:           timestamp('expires_at').notNull(),
  createdAt:           timestamp('created_at').defaultNow(),
  updatedAt:           timestamp('updated_at').defaultNow(),
});
