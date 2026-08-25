import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';

export const payoutSchedules = pgTable('payout_schedules', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  driverId:           uuid('driver_id').references(() => drivers.id).notNull(),
  scheduleType:       varchar('schedule_type', { length: 20 }).default('weekly').notNull(), // daily | weekly | biweekly | monthly | manual
  dayOfWeek:          integer('day_of_week').default(1), // 1 = Monday
  dayOfMonth:         integer('day_of_month'),
  minimumAmountMinor: integer('minimum_amount_minor').default(50000).notNull(), // e.g. 500.00
  currencyCode:       varchar('currency_code', { length: 3 }).notNull(),
  isEnabled:          boolean('is_enabled').default(true).notNull(),
  nextRunAt:          timestamp('next_run_at').notNull(),
  lastRunAt:          timestamp('last_run_at'),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
});
