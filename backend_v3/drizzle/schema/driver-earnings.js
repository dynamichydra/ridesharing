import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { rides } from './rides.js';
import { payouts } from './payouts.js';

export const driverEarnings = pgTable('driver_earnings', {
  id:                      uuid('id').primaryKey().defaultRandom(),
  driverId:                uuid('driver_id').references(() => drivers.id).notNull(),
  rideId:                  uuid('ride_id').references(() => rides.id),
  grossFareMinor:          integer('gross_fare_minor').notNull(),
  platformCommissionMinor: integer('platform_commission_minor').default(0).notNull(),
  netFareMinor:            integer('net_fare_minor').notNull(),
  tipMinor:                integer('tip_minor').default(0).notNull(),
  tollMinor:               integer('toll_minor').default(0).notNull(),
  taxMinor:                integer('tax_minor').default(0).notNull(),
  incentiveBonusMinor:     integer('incentive_bonus_minor').default(0).notNull(),
  currencyCode:            varchar('currency_code', { length: 3 }).notNull(),
  status:                  varchar('status', { length: 20 }).default('available').notNull(), // pending | available | paid_out | clawed_back
  payoutId:                uuid('payout_id').references(() => payouts.id),
  createdAt:               timestamp('created_at').defaultNow().notNull(),
  updatedAt:               timestamp('updated_at').defaultNow().notNull(),
});
