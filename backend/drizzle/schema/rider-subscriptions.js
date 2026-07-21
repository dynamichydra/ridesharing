import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { riderSubscriptionPlans } from './rider-subscription-plans.js';

export const riderSubscriptions = pgTable('rider_subscriptions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  riderId:       uuid('rider_id').references(() => users.id).notNull(),
  planId:        uuid('plan_id').references(() => riderSubscriptionPlans.id).notNull(),
  status:        varchar('status').default('active'),
  // active | expired | cancelled | trial
  startDate:     timestamp('start_date').defaultNow(),
  endDate:       timestamp('end_date'),              // null = lifetime
  // Denormalized snapshot of what was charged — payment identifiers/attempts live on `payments`.
  currencyCode:  varchar('currency_code', { length: 3 }),
  amountMinor:   integer('amount_minor'),
  cancelledAt:   timestamp('cancelled_at'),
  cancelNote:    varchar('cancel_note', { length: 255 }),
  createdAt:     timestamp('created_at').defaultNow(),
});
