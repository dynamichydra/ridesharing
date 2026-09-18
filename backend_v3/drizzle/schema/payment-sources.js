import { pgTable, uuid, varchar, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { paymentIntents } from './payment-intents.js';

export const paymentSources = pgTable('payment_sources', {
  id:              uuid('id').primaryKey().defaultRandom(),
  paymentIntentId: uuid('payment_intent_id').references(() => paymentIntents.id).notNull(),
  sourceType:      varchar('source_type', { length: 30 }).notNull(), // wallet | promo | card | upi | corporate_credit | cash
  sourceId:        varchar('source_id', { length: 100 }), // wallet ID, promo credit ID, or card token
  amountMinor:     integer('amount_minor').notNull(),
  currencyCode:    varchar('currency_code', { length: 3 }).notNull(),
  priority:        integer('priority').default(1).notNull(), // deduction order (e.g. Promo=1, Wallet=2, PSP=3)
  status:          varchar('status', { length: 20 }).default('pending').notNull(), // pending | reserved | charged | failed | refunded
  metadata:        jsonb('metadata'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
});
