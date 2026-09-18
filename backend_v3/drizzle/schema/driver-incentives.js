import { pgTable, uuid, varchar, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';
import { cities } from './cities.js';
import { drivers } from './drivers.js';

export const driverIncentiveCampaigns = pgTable('driver_incentive_campaigns', {
  id:           uuid('id').primaryKey().defaultRandom(),
  title:        varchar('title', { length: 150 }).notNull(),
  description:  text('description'),
  type:         varchar('type', { length: 40 }).notNull(), // trip_milestone | streak | surge_bonus | hours_online | earnings_guarantee
  countryId:    uuid('country_id').references(() => countries.id),
  cityId:       uuid('city_id').references(() => cities.id),
  currencyCode: varchar('currency_code', { length: 3 }).notNull(),
  budgetMinor:  integer('budget_minor'),
  spentMinor:   integer('spent_minor').default(0).notNull(),
  status:       varchar('status', { length: 20 }).default('draft').notNull(), // draft | active | paused | completed
  startAt:      timestamp('start_at').notNull(),
  endAt:        timestamp('end_at').notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
  updatedAt:    timestamp('updated_at').defaultNow().notNull(),
});

export const driverIncentiveRules = pgTable('driver_incentive_rules', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  campaignId:          uuid('campaign_id').references(() => driverIncentiveCampaigns.id).notNull(),
  targetTrips:         integer('target_trips'),
  targetHours:         integer('target_hours'),
  rewardAmountMinor:   integer('reward_amount_minor').notNull(),
  currencyCode:        varchar('currency_code', { length: 3 }).notNull(),
  conditions:          jsonb('conditions'), // e.g. { minRating: 4.8, eligibleZones: [...] }
  createdAt:           timestamp('created_at').defaultNow().notNull(),
});

export const driverIncentiveProgress = pgTable('driver_incentive_progress', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  driverId:            uuid('driver_id').references(() => drivers.id).notNull(),
  campaignId:          uuid('campaign_id').references(() => driverIncentiveCampaigns.id).notNull(),
  ruleId:              uuid('rule_id').references(() => driverIncentiveRules.id).notNull(),
  currentTrips:        integer('current_trips').default(0).notNull(),
  currentHours:        integer('current_hours').default(0).notNull(),
  status:              varchar('status', { length: 20 }).default('in_progress').notNull(), // in_progress | achieved | claimed | expired
  achievedAt:          timestamp('achieved_at'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
});

export const driverIncentiveRewards = pgTable('driver_incentive_rewards', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  driverId:            uuid('driver_id').references(() => drivers.id).notNull(),
  campaignId:          uuid('campaign_id').references(() => driverIncentiveCampaigns.id).notNull(),
  ruleId:              uuid('rule_id').references(() => driverIncentiveRules.id).notNull(),
  rewardAmountMinor:   integer('reward_amount_minor').notNull(),
  currencyCode:        varchar('currency_code', { length: 3 }).notNull(),
  status:              varchar('status', { length: 20 }).default('credited').notNull(), // pending | credited | paid_out
  ledgerTransactionId: uuid('ledger_transaction_id'),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
});
