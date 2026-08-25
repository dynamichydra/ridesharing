import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { promos } from './promos.js';
import { promotionCampaigns } from './promotion-campaigns.js';
import { users } from './users.js';
import { rides } from './rides.js';

export const promoRedemptions = pgTable('promo_redemptions', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  promoId:             uuid('promo_id').references(() => promos.id),
  campaignId:          uuid('campaign_id').references(() => promotionCampaigns.id),
  userId:              uuid('user_id').references(() => users.id).notNull(),
  rideId:              uuid('ride_id').references(() => rides.id),
  discountAmountMinor: integer('discount_amount_minor').notNull(),
  currencyCode:        varchar('currency_code', { length: 3 }).notNull(),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
});
