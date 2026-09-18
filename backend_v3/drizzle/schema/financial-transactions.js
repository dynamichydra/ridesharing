import { pgTable, uuid, varchar, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { legalEntities } from './legal-entities.js';

// Universal Domain Financial Transaction entity that records every economic money-movement event
// prior to or alongside ledger posting.
export const financialTransactions = pgTable('financial_transactions', {
  id:              uuid('id').primaryKey().defaultRandom(),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(),
  // e.g. RIDE_PAYMENT, REFUND, PROMO, WALLET_TOPUP, WALLET_SPEND, SUBSCRIPTION, CORPORATE_INVOICE,
  // DRIVER_INCENTIVE, DRIVER_PAYOUT, CASH_COLLECTION, CASH_SETTLEMENT, FX_CONVERSION, MANUAL_ADJUSTMENT, CHARGEBACK, REVERSAL
  referenceType:   varchar('reference_type', { length: 50 }).notNull(), // ride, subscription, wallet, payout, corporate_invoice, refund, cash_collection
  referenceId:     uuid('reference_id'),
  currencyCode:    varchar('currency_code', { length: 3 }).notNull(),
  amountMinor:     integer('amount_minor').notNull(),
  status:          varchar('status', { length: 20 }).default('pending').notNull(), // pending, settled, failed, disputed, reversed
  countryId:       uuid('country_id').references(() => countries.id),
  legalEntityId:   uuid('legal_entity_id').references(() => legalEntities.id),
  metadata:        jsonb('metadata'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
  updatedAt:       timestamp('updated_at').defaultNow().notNull(),
});
