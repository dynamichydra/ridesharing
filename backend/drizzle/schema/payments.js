import { pgTable, uuid, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions.js';
import { countries } from './countries.js';
import { rides } from './rides.js';

// One row per payment attempt against a gateway. Replaces the paymentId/orderId/amount
// fields that used to live directly on subscriptions — a subscription can have several
// payment attempts (retries, renewals) over its lifetime.
// A row belongs to either a subscription (driver billing) or a ride (rider fare) — exactly
// one of subscriptionId/rideId is set once the attempt resolves; both are nullable so the
// row can exist before either link is known (e.g. a pending gateway order).
export const payments = pgTable('payments', {
  id:               uuid('id').primaryKey().defaultRandom(),
  subscriptionId:   uuid('subscription_id').references(() => subscriptions.id), // null until the payment is captured and a subscription is activated
  rideId:           uuid('ride_id').references(() => rides.id), // set for rider ride-fare payments (online or cash)
  countryId:        uuid('country_id').references(() => countries.id).notNull(),
  gateway:          varchar('gateway', { length: 20 }).notNull(),   // razorpay | stripe | cash
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
