import { pgTable, uuid, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const promotionCampaigns = pgTable('promotion_campaigns', {
  id:           uuid('id').primaryKey().defaultRandom(),
  title:        varchar('title', { length: 150 }).notNull(),
  description:  text('description'),
  campaignType: varchar('campaign_type', { length: 40 }).default('ride_discount').notNull(), // ride_discount | wallet_cashback | referral_bonus
  countryId:    uuid('country_id').references(() => countries.id),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  budgetMinor:  integer('budget_minor'), // null = unlimited
  spentMinor:   integer('spent_minor').default(0).notNull(),
  status:       varchar('status', { length: 20 }).default('draft').notNull(), // draft | active | paused | completed
  startAt:      timestamp('start_at').notNull(),
  endAt:        timestamp('end_at'),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});
