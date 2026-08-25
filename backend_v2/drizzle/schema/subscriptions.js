import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { subscriptionPlans } from './subscription-plans.js';
import { subscriptionStatusEnum } from './enums.js';

export const subscriptions = pgTable('subscriptions', {
  id:            uuid('id').primaryKey().defaultRandom(),
  driverId:      uuid('driver_id').references(() => drivers.id).notNull(),
  planId:        uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  status:        subscriptionStatusEnum('status').default('active'),

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
