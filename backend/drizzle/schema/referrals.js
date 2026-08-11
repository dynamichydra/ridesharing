import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const referrals = pgTable('referrals', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').references(() => users.id).notNull(),
  refereeId: uuid('referee_id').references(() => users.id).notNull().unique(),
  referralCode: varchar('referral_code', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | completed | expired
  rewardAmountMinor: integer('reward_amount_minor').default(500).notNull(), // default $5.00 / 500 minor units
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});
