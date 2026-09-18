import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { payments } from './payments.js';
import { paymentIntents } from './payment-intents.js';

export const paymentAllocations = pgTable('payment_allocations', {
  id:              uuid('id').primaryKey().defaultRandom(),
  paymentId:       uuid('payment_id').references(() => payments.id),
  paymentIntentId: uuid('payment_intent_id').references(() => paymentIntents.id).notNull(),
  sourceType:      varchar('source_type', { length: 30 }).notNull(), // wallet | promo | psp | corporate | cash
  sourceId:        varchar('source_id', { length: 100 }),
  amountMinor:     integer('amount_minor').notNull(),
  currencyCode:    varchar('currency_code', { length: 3 }).notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});
