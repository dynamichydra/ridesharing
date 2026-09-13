import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, index, unique } from 'drizzle-orm/pg-core';
import { commissionRules } from './commission-rules.js';
import { countries } from './countries.js';
import { cities } from './cities.js';
import { vehicleTypes } from './vehicle-types.js';
import { admins } from './admins.js';
import { commissionBaseEnum } from './enums.js';

export const commissionRuleVersions = pgTable('commission_rule_versions', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  ruleId:             uuid('rule_id').references(() => commissionRules.id, { onDelete: 'cascade' }).notNull(),
  version:            integer('version').default(1).notNull(),
  name:               varchar('name', { length: 100 }).notNull(),
  countryId:          uuid('country_id').references(() => countries.id),
  cityId:             uuid('city_id').references(() => cities.id),
  vehicleTypeId:      uuid('vehicle_type_id').references(() => vehicleTypes.id),
  serviceTypeId:      uuid('service_type_id'),
  planTierId:         uuid('plan_tier_id'),
  bookingFeeMinor:    integer('booking_fee_minor').default(0).notNull(),
  platformFeeMinor:   integer('platform_fee_minor').default(0).notNull(),
  subscriberRate:     decimal('subscriber_rate', { precision: 5, scale: 4 }).notNull(),
  nonSubscriberRate:  decimal('non_subscriber_rate', { precision: 5, scale: 4 }).notNull(),
  commissionBase:     commissionBaseEnum('commission_base').default('fare_after_booking_fee').notNull(),
  minCommissionMinor: integer('min_commission_minor').default(0),
  maxCommissionMinor: integer('max_commission_minor'),
  priority:           integer('priority').default(1).notNull(),
  effectiveFrom:      timestamp('effective_from').defaultNow().notNull(),
  effectiveTo:        timestamp('effective_to'),
  isActive:           boolean('is_active').default(true).notNull(),
  changeSummary:      varchar('change_summary', { length: 255 }),
  createdByAdminId:   uuid('created_by_admin_id').references(() => admins.id),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  unique('comm_rule_version_uniq').on(t.ruleId, t.version),
  index('comm_rule_versions_rule_active_idx').on(t.ruleId, t.isActive),
  index('comm_rule_versions_effective_idx').on(t.ruleId, t.effectiveFrom, t.effectiveTo),
  index('comm_rule_versions_scope_idx').on(t.countryId, t.cityId, t.vehicleTypeId, t.isActive),
]));
