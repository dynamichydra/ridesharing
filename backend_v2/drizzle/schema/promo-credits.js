import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { promotionCampaigns } from './promotion-campaigns.js';
import { promos } from './promos.js';

export const promoCredits = pgTable('promo_credits', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  userId:               uuid('user_id').references(() => users.id).notNull(),
  campaignId:           uuid('campaign_id').references(() => promotionCampaigns.id),
  promoId:              uuid('promo_id').references(() => promos.id),
  originalAmountMinor:  integer('original_amount_minor').notNull(),
  remainingAmountMinor: integer('remaining_amount_minor').notNull(),
  currencyCode:         varchar('currency_code', { length: 3 }).notNull(),
  expiresAt:            timestamp('expires_at'),
  status:               varchar('status', { length: 20 }).default('active').notNull(), // active | exhausted | expired
  createdAt:            timestamp('created_at').defaultNow().notNull(),
  updatedAt:            timestamp('updated_at').defaultNow().notNull(),
});
