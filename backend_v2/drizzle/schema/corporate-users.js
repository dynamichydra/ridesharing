import { pgTable, uuid, varchar, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { corporateAccounts } from './corporate-accounts.js';
import { users } from './users.js';

export const corporateUsers = pgTable('corporate_users', {
  id:                     uuid('id').primaryKey().defaultRandom(),
  corporateAccountId:     uuid('corporate_account_id').references(() => corporateAccounts.id).notNull(),
  userId:                 uuid('user_id').references(() => users.id).notNull(),
  role:                   varchar('role', { length: 30 }).default('employee').notNull(), // admin | manager | employee
  department:             varchar('department', { length: 80 }),
  spendingLimitMinor:     integer('spending_limit_minor'), // null = unlimited within account limit
  spendingPeriod:         varchar('spending_period', { length: 20 }).default('monthly'), // daily | weekly | monthly
  currentPeriodSpentMinor:integer('current_period_spent_minor').default(0).notNull(),
  status:                 varchar('status', { length: 20 }).default('active').notNull(), // active | suspended | revoked
  createdAt:              timestamp('created_at').defaultNow().notNull(),
  updatedAt:              timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  unique().on(t.corporateAccountId, t.userId),
]));
