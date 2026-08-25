import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const paymentCountryRules = pgTable('payment_country_rules', {
  id:                uuid('id').primaryKey().defaultRandom(),
  countryId:         uuid('country_id').references(() => countries.id).notNull(),
  paymentMethod:     varchar('payment_method', { length: 30 }).notNull(), // card | upi | wallet | cash | bank_transfer
  minAmountMinor:    integer('min_amount_minor').default(0).notNull(),
  maxAmountMinor:    integer('max_amount_minor'),
  captureSupported:  boolean('capture_supported').default(true).notNull(),
  refundSupported:   boolean('refund_supported').default(true).notNull(),
  transferSupported: boolean('transfer_supported').default(true).notNull(),
  walletAllowed:     boolean('wallet_allowed').default(true).notNull(),
  cashAllowed:       boolean('cash_allowed').default(true).notNull(),
  payoutFrequency:   varchar('payout_frequency', { length: 20 }).default('weekly').notNull(), // daily | weekly | biweekly | monthly
  createdAt:         timestamp('created_at').defaultNow().notNull(),
  updatedAt:         timestamp('updated_at').defaultNow().notNull(),
});
