import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { cashCollections } from './cash-collections.js';
import { rides } from './rides.js';
import { drivers } from './drivers.js';
import { users } from './users.js';
import { admins } from './admins.js';

export const cashDisputes = pgTable('cash_disputes', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  cashCollectionId:     uuid('cash_collection_id').references(() => cashCollections.id).notNull(),
  rideId:               uuid('ride_id').references(() => rides.id).notNull(),
  driverId:             uuid('driver_id').references(() => drivers.id).notNull(),
  riderId:              uuid('rider_id').references(() => users.id).notNull(),
  expectedAmountMinor:  integer('expected_amount_minor').notNull(),
  driverReportedMinor:  integer('driver_reported_minor').notNull(),
  riderReportedMinor:   integer('rider_reported_minor'),
  currencyCode:         varchar('currency_code', { length: 3 }).notNull(),
  status:               varchar('status', { length: 30 }).default('open').notNull(),
  // open | under_review | resolved_driver_favored | resolved_rider_favored | split_adjusted
  resolutionNotes:      text('resolution_notes'),
  resolvedById:         uuid('resolved_by_id').references(() => admins.id),
  resolvedAt:           timestamp('resolved_at'),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
});
