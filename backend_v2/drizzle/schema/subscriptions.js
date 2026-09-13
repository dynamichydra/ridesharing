import { pgTable, uuid, varchar, boolean, timestamp, integer, bigint, index } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { subscriptionPlans } from './subscription-plans.js';
import { subscriptionPlanVersions } from './subscription-plan-versions.js';
import { subscriptionStatusEnum } from './enums.js';

export const subscriptions = pgTable('subscriptions', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  driverId:           uuid('driver_id').references(() => drivers.id).notNull(),
  planId:             uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  planVersionId:      uuid('plan_version_id').references(() => subscriptionPlanVersions.id),
  status:             subscriptionStatusEnum('status').default('active').notNull(),

  // pending | trialing | active | past_due | paused | cancelled | expired | payment_failed | inactive
  startDate:          timestamp('start_date').defaultNow().notNull(),
  endDate:            timestamp('end_date'),              // null = lifetime
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd:   timestamp('current_period_end'),
  trialEndsAt:        timestamp('trial_ends_at'),
  pausedAt:           timestamp('paused_at'),
  resumedAt:          timestamp('resumed_at'),
  gracePeriodEndsAt:  timestamp('grace_period_ends_at'),
  autoRenew:          boolean('auto_renew').default(true).notNull(),

  // Denormalized snapshot of what was charged for historical auditability
  currencyCode:       varchar('currency_code', { length: 3 }),
  amountMinor:        bigint('amount_minor', { mode: 'number' }),

  cancelledAt:        timestamp('cancelled_at'),
  cancelNote:         varchar('cancel_note', { length: 255 }),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
}, (t) => ([
  index('subscriptions_driver_status_idx').on(t.driverId, t.status),
  index('subscriptions_driver_end_date_idx').on(t.driverId, t.endDate),
  index('subscriptions_status_end_date_idx').on(t.status, t.endDate),
  index('subscriptions_plan_version_idx').on(t.planVersionId),
]));
