import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { cities } from './cities.js';
import { cityTypes } from './city-types.js';
import { countries } from './countries.js';
import { zones } from './zones.js';
import { vehicleTypes } from './vehicle-types.js';

export const pricingProfiles = pgTable('pricing_profiles', {
  id:            uuid('id').primaryKey().defaultRandom(),
  countryId:     uuid('country_id').references(() => countries.id),
  cityTypeId:    uuid('city_type_id').references(() => cityTypes.id),
  cityId:        uuid('city_id').references(() => cities.id),
  zoneId:        uuid('zone_id').references(() => zones.id),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id),
  name:          varchar('name', { length: 150 }).notNull(),
  code:          varchar('code', { length: 50 }).notNull(), // e.g. KOLKATA_STANDARD, MUMBAI_AIRPORT
  description:   text('description'),
  isActive:      boolean('is_active').default(true),
  createdAt:     timestamp('created_at').defaultNow(),
  updatedAt:     timestamp('updated_at').defaultNow(),
});
