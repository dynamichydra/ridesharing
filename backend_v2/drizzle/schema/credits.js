import { pgTable, uuid, varchar, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const credits = pgTable('credits', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  userId:               uuid('user_id').references(() => users.id).notNull(),
  creditType:           varchar('credit_type', { length: 30 }).notNull(), // promotional_credit | refund_credit | loyalty_credit | prepaid_balance
  originalAmountMinor:  integer('original_amount_minor').notNull(),
  remainingAmountMinor: integer('remaining_amount_minor').notNull(),
  currencyCode:         varchar('currency_code', { length: 3 }).notNull(),
  status:               varchar('status', { length: 20 }).default('active').notNull(), // active | expired | exhausted | cancelled
  campaignId:           uuid('campaign_id'),
  expiresAt:            timestamp('expires_at'),
  metadata:             jsonb('metadata'),
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
});
