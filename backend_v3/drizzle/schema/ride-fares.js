import { pgTable, uuid, varchar, numeric, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { fareDistanceSourceEnum } from './enums.js';
import { rides } from './rides.js';
import { users } from './users.js';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { airports } from './airports.js';
import { vehicleTypes } from './vehicle-types.js';
import { pricingPlans } from './pricing-plans.js';
import { pricingPlanVersions } from './pricing-plan-versions.js';

export const rideFares = pgTable('ride_fares', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  rideId:                   uuid('ride_id').references(() => rides.id, { onDelete: 'cascade' }).notNull().unique(),
  userId:                   uuid('user_id').references(() => users.id).notNull(),
  cityId:                   uuid('city_id').references(() => cities.id).notNull(),
  pickupZoneId:             uuid('pickup_zone_id').references(() => zones.id),
  destinationZoneId:        uuid('destination_zone_id').references(() => zones.id),
  pickupAirportId:          uuid('pickup_airport_id').references(() => airports.id),
  destinationAirportId:     uuid('destination_airport_id').references(() => airports.id),
  vehicleTypeId:            uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  pricingPlanId:            uuid('pricing_plan_id').references(() => pricingPlans.id).notNull(),
  pricingPlanVersionId:     uuid('pricing_plan_version_id').references(() => pricingPlanVersions.id).notNull(),
  currencyCode:             varchar('currency_code', { length: 10 }).notNull().default('INR'),

  // Distance & Duration (Estimated vs Actual)
  estimatedDistanceMeters:  integer('estimated_distance_meters'),
  actualDistanceMeters:     integer('actual_distance_meters'),
  estimatedDurationSeconds: integer('estimated_duration_seconds'),
  actualDurationSeconds:    integer('actual_duration_seconds'),
  waitingSeconds:           integer('waiting_seconds').default(0).notNull(),

  // Financial Components (in integer minor units / paise / cents)
  baseFare:                 integer('base_fare').notNull(),
  distanceFare:             integer('distance_fare').notNull(),
  timeFare:                 integer('time_fare').notNull(),
  waitingFare:              integer('waiting_fare').default(0).notNull(),
  nightSurcharge:           integer('night_surcharge').default(0).notNull(),
  peakSurcharge:            integer('peak_surcharge').default(0).notNull(),
  surgeAmount:              integer('surge_amount').default(0).notNull(),
  surgeMultiplier:          numeric('surge_multiplier', { precision: 8, scale: 4 }).default('1.0000').notNull(),
  airportFee:               integer('airport_fee').default(0).notNull(),
  tollAmount:               integer('toll_amount').default(0).notNull(),
  bookingFee:               integer('booking_fee').default(0).notNull(),
  platformFee:              integer('platform_fee').default(0).notNull(),
  discountAmount:           integer('discount_amount').default(0).notNull(),
  taxAmount:                integer('tax_amount').default(0).notNull(),
  subtotal:                 integer('subtotal').notNull(),
  total:                    integer('total').notNull(),

  couponCode:               varchar('coupon_code', { length: 50 }),
  distanceSource:           fareDistanceSourceEnum('distance_source').default('google'),
  calculationMetadata:      jsonb('calculation_metadata'),

  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  rideUnique:   uniqueIndex('ride_fares_ride_unique').on(table.rideId),
  cityIndex:    index('ride_fares_city_idx').on(table.cityId),
  userIndex:    index('ride_fares_user_idx').on(table.userId),
  createdIndex: index('ride_fares_created_idx').on(table.createdAt),
}));
