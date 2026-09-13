import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, index } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { countries } from './countries.js';
import { cities } from './cities.js';
import { commissionBaseEnum } from './enums.js';

// Production-grade per-ride commission configuration supporting multi-tier scoping:
// 1. City + Vehicle Type + Service Type + Plan Tier
// 2. City + Vehicle Type + Service Type
// 3. City + Vehicle Type
// 4. City Default
// 5. Country + Vehicle Type + Service Type
// 6. Country + Vehicle Type
// 7. Country Default
// 8. Global Default
export const commissionRules = pgTable('commission_rules', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  currentVersionId:   uuid('current_version_id'),
  version:            integer('version').default(1).notNull(),
  name:               varchar('name', { length: 100 }).notNull(),
  countryId:          uuid('country_id').references(() => countries.id),         // null = global default
  cityId:             uuid('city_id').references(() => cities.id),               // null = country-wide / global default
  vehicleTypeId:      uuid('vehicle_type_id').references(() => vehicleTypes.id), // null = all types
  serviceTypeId:      uuid('service_type_id'),                                   // null = all services
  planTierId:         uuid('plan_tier_id'),                                      // null = all subscription tiers
  bookingFeeMinor:    integer('booking_fee_minor').notNull().default(0),         // flat fee taken off top before split
  platformFeeMinor:   integer('platform_fee_minor').notNull().default(0),        // optional separate platform fee
  subscriberRate:     decimal('subscriber_rate', { precision: 5, scale: 4 }).notNull(),    // e.g. 0.1500 = 15%
  nonSubscriberRate:  decimal('non_subscriber_rate', { precision: 5, scale: 4 }).notNull(), // e.g. 0.2500 = 25%
  commissionBase:     commissionBaseEnum('commission_base').default('fare_after_booking_fee').notNull(),
  minCommissionMinor: integer('min_commission_minor').default(0),                // floor: minimum platform cut on any trip
  maxCommissionMinor: integer('max_commission_minor'),                           // cap: ceiling on platform cut
  isActive:           boolean('is_active').default(true).notNull(),
  priority:           integer('priority').default(1).notNull(),                  // higher wins within same specificity tier
  effectiveFrom:      timestamp('effective_from').defaultNow().notNull(),
  effectiveTo:        timestamp('effective_to'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  index('comm_rules_scope_idx').on(t.countryId, t.cityId, t.vehicleTypeId, t.isActive),
  index('comm_rules_priority_idx').on(t.priority, t.isActive),
  index('comm_rules_effective_idx').on(t.effectiveFrom, t.effectiveTo, t.isActive),
]));
