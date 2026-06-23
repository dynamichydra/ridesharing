import { pgTable, uuid, varchar, timestamp, decimal } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { subscriptionPlans } from './subscription-plans.js';

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  driverId: uuid('driver_id').references(() => drivers.id).notNull(),
  planId: uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  status: varchar('status').default('active'),
  // active | expired | cancelled | trial
  startDate: timestamp('start_date').defaultNow(),
  endDate: timestamp('end_date'),              // null = lifetime
  paymentId: varchar('payment_id'),
  orderId: varchar('order_id'),
  amount: decimal('amount', { precision: 10, scale: 2 }),
  cancelledAt: timestamp('cancelled_at'),
  cancelNote: varchar('cancel_note', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
});
