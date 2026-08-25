import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, time } from 'drizzle-orm/pg-core';
import { vehicleTypes } from './vehicle-types.js';
import { zones } from './zones.js';
import { countries } from './countries.js';

export const fareRules = pgTable('fare_rules', {
  id:            uuid('id').primaryKey().defaultRandom(),
  name:          varchar('name', { length: 100 }).notNull(),
  countryId:     uuid('country_id').references(() => countries.id),         // null = applies in every country
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id), // null = all types
  zoneId:        uuid('zone_id').references(() => zones.id),                // null = all zones
  ruleType:      varchar('rule_type', { length: 30 }).notNull(),           // time | traffic | zone | demand
  startTime:     time('start_time'),            // e.g. "22:00" for night
  endTime:       time('end_time'),              // e.g. "05:00"
  daysOfWeek:    integer('days_of_week').array(),  // [0..6], null = all days
  trafficDelayS: integer('traffic_delay_s'),    // only for ruleType=traffic, threshold in seconds
  multiplier:    decimal('multiplier', { precision: 5, scale: 2 }).notNull(),
  flatFareMinor: integer('flat_fare_minor'),     // when set, overrides the computed fare entirely instead of multiplying
  allowedVehicleTypeIds: uuid('allowed_vehicle_type_ids').array(), // restrict which vehicle types may serve this rule's zone; null = no restriction
  priority:      integer('priority').default(1),
  isActive:      boolean('is_active').default(true),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
});
