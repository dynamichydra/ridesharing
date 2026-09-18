import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { users } from './users.js';

// One wallet per owner. Exactly one of driverId/riderId is set per row — the same
// "polymorphic owner" convention payments.js uses for subscriptionId/rideId. Postgres
// unique constraints ignore NULLs, so driverId/riderId each being .unique() naturally
// caps a single wallet per owner without a partial index.
// Drivers always have a wallet (created lazily on first access — see wallet.service.js
// getOrCreateWallet). Riders don't get one until an admin explicitly credits them.
export const wallets = pgTable('wallets', {
  id:           uuid('id').primaryKey().defaultRandom(),
  driverId:     uuid('driver_id').references(() => drivers.id).unique(),
  riderId:      uuid('rider_id').references(() => users.id).unique(),
  balanceMinor: integer('balance_minor').notNull().default(0),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  status:       varchar('status', { length: 20 }).default('active'), // active | frozen
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
});
