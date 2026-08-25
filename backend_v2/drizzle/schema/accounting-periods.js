import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { admins } from './admins.js';

export const accountingPeriods = pgTable('accounting_periods', {
  id:          uuid('id').primaryKey().defaultRandom(),
  periodName:  varchar('period_name', { length: 30 }).notNull().unique(), // e.g. "2026-08"
  startDate:   timestamp('start_date').notNull(),
  endDate:     timestamp('end_date').notNull(),
  status:      varchar('status', { length: 20 }).default('open').notNull(), // open | closed
  closedAt:    timestamp('closed_at'),
  closedById:  uuid('closed_by_id').references(() => admins.id),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
});
