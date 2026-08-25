import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { ledgerTransactions } from './ledger-transactions.js';
import { ledgerAccounts } from './ledger-accounts.js';

// Append-only. A row is never updated or deleted once written — a correction is a new
// reversing entry in a new ledger_transactions row, never an edit to this one. Every
// transaction's entries must sum to zero per currencyCode (enforced by
// ledgerService.postTransaction, not by a DB constraint, since Postgres can't express a
// cross-row balance invariant declaratively).
export const ledgerEntries = pgTable('ledger_entries', {
  id:            uuid('id').primaryKey().defaultRandom(),
  transactionId: uuid('transaction_id').references(() => ledgerTransactions.id).notNull(),
  accountId:     uuid('account_id').references(() => ledgerAccounts.id).notNull(),
  direction:     varchar('direction', { length: 6 }).notNull(), // debit | credit
  amountMinor:   integer('amount_minor').notNull(),
  currencyCode:  varchar('currency_code', { length: 3 }).notNull(),
  createdAt:     timestamp('created_at').defaultNow(),
});
