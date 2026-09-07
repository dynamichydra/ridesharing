import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { drivers } from './drivers.js';

export const driverGroups = pgTable('driver_groups', {
  id:          uuid('id').primaryKey().defaultRandom(),
  countryId:   uuid('country_id').references(() => countries.id), // null = global, or specific country
  name:        varchar('name', { length: 100 }).notNull(),        // e.g. "Airport Chauffeurs", "EV Partners", "Top Tier Drivers"
  code:        varchar('code', { length: 50 }).unique().notNull(), // e.g. "AIRPORT_FLEET", "EV_COHORT"
  description: text('description'),
  isActive:    boolean('is_active').default(true),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});

export const driverGroupMembers = pgTable('driver_group_members', {
  id:         uuid('id').primaryKey().defaultRandom(),
  groupId:    uuid('group_id').references(() => driverGroups.id).notNull(),
  driverId:   uuid('driver_id').references(() => drivers.id).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
  expiresAt:  timestamp('expires_at'), // optional temporary membership (null = permanent until removed)
});
