import { pgTable, uuid, integer, decimal, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { cityTypes } from './city-types.js';
import { vehicleTypes } from './vehicle-types.js';

/**
 * city_type_fares
 *
 * Defines Fare Rates and Commission Rates for each vehicle type
 * within each City Type (e.g. Tier-1 Metro, Tier-2 Urban, Tourist Hub, Rural).
 * Supports version history: only 1 version per (cityTypeId, vehicleTypeId) is active at a time.
 */
export const cityTypeFares = pgTable('city_type_fares', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  cityTypeId:              uuid('city_type_id').references(() => cityTypes.id, { onDelete: 'cascade' }).notNull(),
  vehicleTypeId:           uuid('vehicle_type_id').references(() => vehicleTypes.id, { onDelete: 'cascade' }).notNull(),

  // ── Fare Rate Structure (Minor units: paise / cents) ──
  baseFareMinor:           integer('base_fare_minor').notNull().default(0),
  minFareMinor:            integer('min_fare_minor').notNull().default(0),
  perKmRateMinor:          integer('per_km_rate_minor').notNull().default(0),
  perMinRateMinor:         integer('per_min_rate_minor').notNull().default(0),
  waitingPricePerMinMinor: integer('waiting_price_per_min_minor').default(0),
  waitingGracePeriodMin:   integer('waiting_grace_period_min').default(3),
  bookingFeeMinor:         integer('booking_fee_minor').default(0),
  serviceFeeMinor:         integer('service_fee_minor').default(0),
  cancellationFeeMinor:    integer('cancellation_fee_minor').default(0),
  noShowFeeMinor:          integer('no_show_fee_minor').default(0),
  surgeFloorMultiplier:    decimal('surge_floor_multiplier', { precision: 4, scale: 2 }).default('1.00'),
  surgeCapMultiplier:      decimal('surge_cap_multiplier', { precision: 4, scale: 2 }).default('3.00'),

  // ── Commission Rate Structure (for this city-type + vehicle type) ──
  nonSubscriberCommissionRate: decimal('non_subscriber_commission_rate', { precision: 5, scale: 4 }).default('0.2000'), // e.g. 0.2000 = 20%
  subscriberCommissionRate:    decimal('subscriber_commission_rate', { precision: 5, scale: 4 }).default('0.0500'),    // e.g. 0.0500 = 5%
  platformFeeMinor:            integer('platform_fee_minor').default(0),
  minCommissionMinor:          integer('min_commission_minor').default(0),
  maxCommissionMinor:          integer('max_commission_minor'),

  isActive:                boolean('is_active').default(true),
  createdAt:               timestamp('created_at').defaultNow(),
  updatedAt:               timestamp('updated_at').defaultNow(),
}, (table) => ({
  cityTypeVehicleIdx: index('idx_city_type_fares_type_vehicle').on(table.cityTypeId, table.vehicleTypeId),
  cityTypeVehicleActiveIdx: index('idx_city_type_fares_active').on(table.cityTypeId, table.vehicleTypeId, table.isActive),
}));
