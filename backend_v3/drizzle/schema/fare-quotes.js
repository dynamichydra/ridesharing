import { pgTable, uuid, varchar, numeric, integer, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { fareQuoteStatusEnum, fareDistanceSourceEnum } from './enums.js';
import { users } from './users.js';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { airports } from './airports.js';
import { vehicleTypes } from './vehicle-types.js';
import { pricingPlans } from './pricing-plans.js';
import { pricingPlanVersions } from './pricing-plan-versions.js';

export const fareQuotes = pgTable('fare_quotes', {
  id: uuid('id').primaryKey().defaultRandom(),
  quoteId: varchar('quote_id', { length: 100 }).notNull().unique(),
  userId: uuid('user_id').references(() => users.id),
  cityId: uuid('city_id').references(() => cities.id).notNull(),
  pickupZoneId: uuid('pickup_zone_id').references(() => zones.id),
  destinationZoneId: uuid('destination_zone_id').references(() => zones.id),
  pickupAirportId: uuid('pickup_airport_id').references(() => airports.id),
  destinationAirportId: uuid('destination_airport_id').references(() => airports.id),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  pickupLatitude: numeric('pickup_latitude', { precision: 10, scale: 7 }).notNull(),
  pickupLongitude: numeric('pickup_longitude', { precision: 10, scale: 7 }).notNull(),
  destinationLatitude: numeric('destination_latitude', { precision: 10, scale: 7 }).notNull(),
  destinationLongitude: numeric('destination_longitude', { precision: 10, scale: 7 }).notNull(),
  estimatedDistanceMeters: integer('estimated_distance_meters').notNull(),
  estimatedDurationSeconds: integer('estimated_duration_seconds').notNull(),
  distanceSource: fareDistanceSourceEnum('distance_source').default('google').notNull(),
  pricingPlanId: uuid('pricing_plan_id').references(() => pricingPlans.id),
  pricingPlanVersionId: uuid('pricing_plan_version_id').references(() => pricingPlanVersions.id),
  currencyCode: varchar('currency_code', { length: 10 }).notNull().default('INR'),

  // Detailed Fare Breakdown (in minor units / paise)
  baseFare: integer('base_fare').notNull(),
  distanceFare: integer('distance_fare').notNull(),
  timeFare: integer('time_fare').notNull(),
  waitingFare: integer('waiting_fare').default(0).notNull(),
  nightSurcharge: integer('night_surcharge').default(0).notNull(),
  peakSurcharge: integer('peak_surcharge').default(0).notNull(),
  surgeAmount: integer('surge_amount').default(0).notNull(),
  surgeMultiplier: numeric('surge_multiplier', { precision: 8, scale: 4 }).default('1.0000').notNull(),
  airportFee: integer('airport_fee').default(0).notNull(),
  tollAmount: integer('toll_amount').default(0).notNull(),
  bookingFee: integer('booking_fee').default(0).notNull(),
  platformFee: integer('platform_fee').default(0).notNull(),
  discountAmount: integer('discount_amount').default(0).notNull(),
  taxAmount: integer('tax_amount').default(0).notNull(),
  subtotal: integer('subtotal').notNull(),
  total: integer('total').notNull(),

  couponCode: varchar('coupon_code', { length: 50 }),
  calculationMetadata: jsonb('calculation_metadata'),
  status: fareQuoteStatusEnum('status').default('active').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  quoteIdUnique: uniqueIndex('fare_quotes_quote_id_unique').on(table.quoteId),
  userIndex: index('fare_quotes_user_idx').on(table.userId),
  cityVehicleIndex: index('fare_quotes_city_vehicle_idx').on(table.cityId, table.vehicleTypeId),
  expirationIndex: index('fare_quotes_expiration_idx').on(table.expiresAt, table.status),
}));
