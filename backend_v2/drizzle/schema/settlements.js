import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';

export const settlements = pgTable('settlements', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  gateway:            varchar('gateway', { length: 30 }).notNull(),
  settlementBatchId:  varchar('settlement_batch_id', { length: 100 }).notNull(),
  currencyCode:       varchar('currency_code', { length: 3 }).notNull(),
  grossAmountMinor:   integer('gross_amount_minor').notNull(),
  feeAmountMinor:     integer('fee_amount_minor').default(0).notNull(),
  taxAmountMinor:     integer('tax_amount_minor').default(0).notNull(),
  netAmountMinor:     integer('net_amount_minor').notNull(),
  status:             varchar('status', { length: 20 }).default('completed').notNull(), // pending | completed | discrepancy
  settledAt:          timestamp('settled_at').defaultNow().notNull(),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
});
