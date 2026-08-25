import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { credits } from './credits.js';

export const creditTransactions = pgTable('credit_transactions', {
  id:              uuid('id').primaryKey().defaultRandom(),
  creditId:        uuid('credit_id').references(() => credits.id).notNull(),
  transactionType: varchar('transaction_type', { length: 30 }).notNull(), // grant | spend | refund | expire | cancel
  amountMinor:     integer('amount_minor').notNull(),
  currencyCode:    varchar('currency_code', { length: 3 }).notNull(),
  referenceType:   varchar('reference_type', { length: 30 }), // ride | refund | campaign
  referenceId:     uuid('reference_id'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});
