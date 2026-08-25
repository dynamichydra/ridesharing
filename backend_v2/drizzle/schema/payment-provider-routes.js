import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const paymentProviderRoutes = pgTable('payment_provider_routes', {
  id:              uuid('id').primaryKey().defaultRandom(),
  countryId:       uuid('country_id').references(() => countries.id),
  currencyCode:    varchar('currency_code', { length: 3 }),
  paymentMethod:   varchar('payment_method', { length: 30 }).default('all').notNull(), // card | upi | netbanking | wallet | all
  transactionType: varchar('transaction_type', { length: 40 }).default('all').notNull(), // ride_fare | subscription | wallet_topup | all
  gateway:         varchar('gateway', { length: 30 }).notNull(), // razorpay | cashfree | stripe | mock
  priority:        integer('priority').default(1).notNull(), // lower number = higher priority
  minAmountMinor:  integer('min_amount_minor').default(0).notNull(),
  maxAmountMinor:  integer('max_amount_minor'), // null = unlimited
  isEnabled:       boolean('is_enabled').default(true).notNull(),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
});
