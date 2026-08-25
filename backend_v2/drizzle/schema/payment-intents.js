import { pgTable, uuid, varchar, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const paymentIntents = pgTable('payment_intents', {
  id:                uuid('id').primaryKey().defaultRandom(),
  payerId:           uuid('payer_id').notNull(),
  payerType:         varchar('payer_type', { length: 30 }).default('rider').notNull(), // rider | driver | corporate
  amountMinor:       integer('amount_minor').notNull(),
  currencyCode:      varchar('currency_code', { length: 3 }).notNull(),
  status:            varchar('status', { length: 30 }).default('requires_payment_method').notNull(),
  // requires_payment_method | requires_confirmation | processing | succeeded | failed | cancelled
  clientSecret:      varchar('client_secret', { length: 120 }),
  referenceType:     varchar('reference_type', { length: 50 }).notNull(), // ride | subscription | rider_subscription | wallet_topup | corporate_invoice
  referenceId:       uuid('reference_id'),
  paymentMethodType: varchar('payment_method_type', { length: 30 }), // card | upi | wallet | split | cash | corporate
  countryId:         uuid('country_id').references(() => countries.id),
  metadata:          jsonb('metadata'),
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
});
