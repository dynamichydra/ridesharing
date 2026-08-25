import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { drivers } from './drivers.js';

export const cashCollections = pgTable('cash_collections', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  rideId:                 uuid('ride_id').references(() => rides.id).notNull(),
  driverId:               uuid('driver_id').references(() => drivers.id).notNull(),
  expectedAmountMinor:    integer('expected_amount_minor').notNull(),
  collectedAmountMinor:   integer('collected_amount_minor').notNull(),
  platformCommissionMinor:integer('platform_commission_minor').default(0).notNull(),
  currencyCode:           varchar('currency_code', { length: 3 }).notNull(),
  status:                 varchar('status', { length: 20 }).default('reported').notNull(), // expected | reported | verified | mismatch | disputed
  disputeReason:          text('dispute_reason'),
  reportedAt:             timestamp('reported_at').defaultNow().notNull(),
  verifiedAt:             timestamp('verified_at'),
  createdAt:              timestamp('created_at').defaultNow().notNull(),
  updatedAt:              timestamp('updated_at').defaultNow().notNull(),
});
