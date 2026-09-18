import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, bigint, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { users } from './users.js';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { airports } from './airports.js';
import { vehicleTypes } from './vehicle-types.js';
import { pricingPlans } from './pricing-plans.js';
import { pricingPlanVersions } from './pricing-plan-versions.js';
import { subscriptions } from './subscriptions.js';
import { subscriptionPlans } from './subscription-plans.js';
import { subscriptionPlanVersions } from './subscription-plan-versions.js';
import { commissionRules } from './commission-rules.js';
import { commissionRuleVersions } from './commission-rule-versions.js';
import { commissionBaseEnum, fareDistanceSourceEnum } from './enums.js';

export const rideFinancials = pgTable('ride_financials', {
  id:                       uuid('id').primaryKey().defaultRandom(),
  rideId:                   uuid('ride_id').references(() => rides.id, { onDelete: 'cascade' }).notNull().unique(),
  userId:                   uuid('user_id').references(() => users.id),
  cityId:                   uuid('city_id').references(() => cities.id),
  pickupZoneId:             uuid('pickup_zone_id').references(() => zones.id),
  destinationZoneId:        uuid('destination_zone_id').references(() => zones.id),
  pickupAirportId:          uuid('pickup_airport_id').references(() => airports.id),
  destinationAirportId:     uuid('destination_airport_id').references(() => airports.id),
  vehicleTypeId:            uuid('vehicle_type_id').references(() => vehicleTypes.id),
  pricingPlanId:            uuid('pricing_plan_id').references(() => pricingPlans.id),
  pricingPlanVersionId:     uuid('pricing_plan_version_id').references(() => pricingPlanVersions.id),
  currencyCode:             varchar('currency_code', { length: 10 }).notNull().default('INR'),

  // Distance & Duration
  estimatedDistanceMeters:  integer('estimated_distance_meters'),
  actualDistanceMeters:     integer('actual_distance_meters'),
  estimatedDurationSeconds: integer('estimated_duration_seconds'),
  actualDurationSeconds:    integer('actual_duration_seconds'),
  waitingSeconds:           integer('waiting_seconds').default(0).notNull(),
  distanceSource:           fareDistanceSourceEnum('distance_source').default('google'),

  // Core Fare Snapshot Components (in integer minor units / paise / cents)
  baseFare:                 integer('base_fare').default(0).notNull(),
  distanceFare:             integer('distance_fare').default(0).notNull(),
  timeFare:                 integer('time_fare').default(0).notNull(),
  waitingFare:              integer('waiting_fare').default(0).notNull(),
  nightSurcharge:           integer('night_surcharge').default(0).notNull(),
  peakSurcharge:            integer('peak_surcharge').default(0).notNull(),
  surgeAmount:              integer('surge_amount').default(0).notNull(),
  surgeMultiplier:          decimal('surge_multiplier', { precision: 8, scale: 4 }).default('1.0000').notNull(),
  airportFee:               integer('airport_fee').default(0).notNull(),
  tollAmount:               integer('toll_amount').default(0).notNull(),
  bookingFee:               integer('booking_fee').default(0).notNull(),
  platformFee:              integer('platform_fee').default(0).notNull(),
  discountAmount:           integer('discount_amount').default(0).notNull(),
  taxAmount:                integer('tax_amount').default(0).notNull(),
  subtotal:                 integer('subtotal').default(0).notNull(),
  total:                    integer('total').default(0).notNull(),

  grossFareMinor:           bigint('gross_fare_minor', { mode: 'number' }).default(0).notNull(),
  bookingFeeMinor:          integer('booking_fee_minor').default(0).notNull(),
  platformFeeMinor:         integer('platform_fee_minor').default(0).notNull(),
  promoDiscountMinor:       integer('promo_discount_minor').default(0).notNull(),
  platformSubsidyMinor:     integer('platform_subsidy_minor').default(0).notNull(),
  taxMinor:                 integer('tax_minor').default(0).notNull(),
  tollMinor:                integer('toll_minor').default(0).notNull(),
  tipMinor:                 integer('tip_minor').default(0).notNull(),
  roundingAdjustmentMinor:  integer('rounding_adjustment_minor').default(0).notNull(),

  // Commission & Driver Earnings
  commissionBaseMinor:      bigint('commission_base_minor', { mode: 'number' }).default(0).notNull(),
  commissionBase:           commissionBaseEnum('commission_base').default('fare_after_booking_fee').notNull(),
  commissionRate:           decimal('commission_rate', { precision: 5, scale: 4 }).default('0.1500').notNull(),
  commissionMinor:          integer('commission_minor').default(0).notNull(),
  driverEarningMinor:       bigint('driver_earning_minor', { mode: 'number' }).default(0).notNull(),
  platformRevenueMinor:     bigint('platform_revenue_minor', { mode: 'number' }).default(0).notNull(),

  // Provenance & Snapshot References
  couponCode:               varchar('coupon_code', { length: 50 }),
  isSubscriber:             boolean('is_subscriber').default(false).notNull(),
  subscriptionId:           uuid('subscription_id').references(() => subscriptions.id),
  subscriptionPlanId:       uuid('subscription_plan_id').references(() => subscriptionPlans.id),
  subscriptionPlanVersionId: uuid('subscription_plan_version_id').references(() => subscriptionPlanVersions.id),
  subscriptionPlanVersion:  integer('subscription_plan_version'),

  commissionRuleId:         uuid('commission_rule_id').references(() => commissionRules.id),
  commissionRuleVersionId:  uuid('commission_rule_version_id').references(() => commissionRuleVersions.id),
  commissionRuleVersion:    integer('commission_rule_version'),

  // Structured fee breakdown & Calculation Metadata
  breakdown:                jsonb('breakdown'),
  calculationMetadata:      jsonb('calculation_metadata'),
  idempotencyKey:           varchar('idempotency_key', { length: 128 }).unique(),

  isSettled:                boolean('is_settled').default(false).notNull(),
  calculatedAt:             timestamp('calculated_at').defaultNow().notNull(),
  finalizedAt:              timestamp('finalized_at'),
  settledAt:                timestamp('settled_at'),
  createdAt:                timestamp('created_at').defaultNow().notNull(),
  updatedAt:                timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  index('ride_financials_ride_idx').on(t.rideId),
  index('ride_financials_user_idx').on(t.userId),
  index('ride_financials_city_idx').on(t.cityId),
  index('ride_financials_subscription_idx').on(t.subscriptionId),
  index('ride_financials_rule_idx').on(t.commissionRuleId),
  index('ride_financials_calculated_at_idx').on(t.calculatedAt),
  index('ride_financials_settled_idx').on(t.isSettled),
]));
