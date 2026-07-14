import { pgTable, uuid, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions.js';
import { countries } from './countries.js';

// One row per payment attempt against a gateway. Replaces the paymentId/orderId/amount
// fields that used to live directly on subscriptions — a subscription can have several
// payment attempts (retries, renewals) over its lifetime.
export const payments = pgTable('payments', {
  id:               uuid('id').primaryKey().defaultRandom(),
  subscriptionId:   uuid('subscription_id').references(() => subscriptions.id), // null until the payment is captured and a subscription is activated
  countryId:        uuid('country_id').references(() => countries.id).notNull(),
  gateway:          varchar('gateway', { length: 20 }).notNull(),   // razorpay | stripe
  currencyCode:     varchar('currency_code', { length: 3 }).notNull(),
  amountMinor:      integer('amount_minor').notNull(),
  status:           varchar('status', { length: 20 }).default('created'),
  // created | captured | failed | refunded
  gatewayOrderId:   varchar('gateway_order_id'),
  gatewayPaymentId: varchar('gateway_payment_id'),
  metadata:         jsonb('metadata'),
  createdAt:        timestamp('created_at').defaultNow(),
  updatedAt:        timestamp('updated_at').defaultNow(),
});
