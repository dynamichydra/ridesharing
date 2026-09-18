import { pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { cities } from './cities.js';
import { zones } from './zones.js';
import { airports } from './airports.js';
import { vehicleTypes } from './vehicle-types.js';
import { couponDiscountTypeEnum } from './enums.js';

export const promos = pgTable('promos', {
  id:               uuid('id').primaryKey().defaultRandom(),
  code:             varchar('code', { length: 50 }).notNull().unique(),
  name:             varchar('name', { length: 150 }),
  description:      text('description'),
  discountType:     couponDiscountTypeEnum('discount_type').notNull().default('percentage'), // fixed | percentage
  discountValue:    numeric('discount_value', { precision: 12, scale: 4 }).notNull(), // fixed amount (minor units) or %
  maxDiscountMinor: integer('max_discount_minor'), // cap for percentage discount
  minFareMinor:     integer('min_fare_minor').default(0).notNull(), // minimum fare threshold
  usageLimit:       integer('usage_limit'), // maximum total redemptions
  usedCount:        integer('used_count').default(0).notNull(),
  perUserLimit:     integer('per_user_limit').default(1).notNull(),
  isFirstRideOnly:  boolean('is_first_ride_only').default(false).notNull(),
  validFrom:        timestamp('valid_from').defaultNow().notNull(),
  validUntil:       timestamp('valid_until'),
  countryId:        uuid('country_id').references(() => countries.id),
  cityId:           uuid('city_id').references(() => cities.id),
  zoneId:           uuid('zone_id').references(() => zones.id),
  airportId:        uuid('airport_id').references(() => airports.id),
  vehicleTypeId:    uuid('vehicle_type_id').references(() => vehicleTypes.id),
  isActive:         boolean('is_active').default(true).notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
  updatedAt:        timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  codeUnique:    uniqueIndex('promos_code_unique').on(table.code),
  validityIndex: index('promos_validity_idx').on(table.validFrom, table.validUntil, table.isActive),
  activeIndex:   index('promos_active_idx').on(table.isActive),
}));
