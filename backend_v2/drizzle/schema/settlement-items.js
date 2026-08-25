import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { settlements } from './settlements.js';
import { payments } from './payments.js';

export const settlementItems = pgTable('settlement_items', {
  id:               uuid('id').primaryKey().defaultRandom(),
  settlementId:     uuid('settlement_id').references(() => settlements.id).notNull(),
  gatewayPaymentId: varchar('gateway_payment_id', { length: 100 }).notNull(),
  paymentId:        uuid('payment_id').references(() => payments.id),
  type:             varchar('type', { length: 30 }).default('payment').notNull(), // payment | refund | chargeback | transfer
  grossMinor:       integer('gross_minor').notNull(),
  feeMinor:         integer('fee_minor').default(0).notNull(),
  netMinor:         integer('net_minor').notNull(),
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  createdAt:        timestamp('created_at').defaultNow().notNull(),
});
