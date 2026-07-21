import { pgTable, uuid, varchar, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { subscriptions } from './subscriptions.js';
import { riderSubscriptions } from './rider-subscriptions.js';
import { countries } from './countries.js';
import { rides } from './rides.js';

// One row per payment attempt against a gateway. Replaces the paymentId/orderId/amount
// fields that used to live directly on subscriptions — a subscription can have several
// payment attempts (retries, renewals) over its lifetime.
// A row belongs to a driver subscription, a rider subscription, or a ride (rider fare) —
// exactly one of subscriptionId/riderSubscriptionId/rideId is set once the attempt resolves;
// all three are nullable so the row can exist before any link is known (e.g. a pending
// gateway order).
export const payments = pgTable('payments', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  subscriptionId:      uuid('subscription_id').references(() => subscriptions.id), // null until the payment is captured and a driver subscription is activated
  riderSubscriptionId: uuid('rider_subscription_id').references(() => riderSubscriptions.id), // null until a rider subscription is activated
  rideId:              uuid('ride_id').references(() => rides.id), // set for rider ride-fare payments (online or cash)
  countryId:           uuid('country_id').references(() => countries.id).notNull(),
  gateway:             varchar('gateway', { length: 20 }).notNull(),   // razorpay | stripe | cash
  currencyCode:        varchar('currency_code', { length: 3 }).notNull(),
  amountMinor:         integer('amount_minor').notNull(),
  status:              varchar('status', { length: 20 }).default('created'),
  // created | captured | failed | refunded
  gatewayOrderId:      varchar('gateway_order_id'),
  gatewayPaymentId:    varchar('gateway_payment_id'),
  metadata:            jsonb('metadata'),
  createdAt:           timestamp('created_at').defaultNow(),
  updatedAt:           timestamp('updated_at').defaultNow(),
});
