import { pgTable, uuid, varchar, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { wallets } from './wallets.js';

// Append-only ledger — one row per balance movement. `reason` is a free varchar (not a DB
// enum) so admins/other flows can introduce new reasons without a migration; the portal
// treats it as display-only data, not a hardcoded list.
export const walletTransactions = pgTable('wallet_transactions', {
  id:                uuid('id').primaryKey().defaultRandom(),
  walletId:          uuid('wallet_id').references(() => wallets.id).notNull(),
  type:              varchar('type', { length: 10 }).notNull(), // credit | debit
  amountMinor:       integer('amount_minor').notNull(),
  balanceAfterMinor: integer('balance_after_minor').notNull(), // ledger snapshot after this entry
  currencyCode:      varchar('currency_code', { length: 3 }).notNull(),
  reason:            varchar('reason', { length: 50 }).notNull(), // admin_adjustment | ride_refund | bonus | penalty | topup | ...
  referenceType:     varchar('reference_type', { length: 30 }), // e.g. 'ride' | 'subscription' | 'manual'
  referenceId:       uuid('reference_id'),
  description:       text('description'),
  createdBy:         uuid('created_by'), // admin id, for manual adjustments
  createdAt:         timestamp('created_at').defaultNow(),
});
