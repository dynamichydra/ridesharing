import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { drivers } from './drivers.js';

export const paymentMethods = pgTable('payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  gateway: varchar('gateway', { length: 50 }).notNull(), // stripe, razorpay
  gatewayCustomerId: varchar('gateway_customer_id', { length: 100 }),
  paymentMethodToken: varchar('payment_method_token', { length: 100 }).notNull(),
  last4: varchar('last4', { length: 4 }),
  cardBrand: varchar('card_brand', { length: 50 }),
  expiryMonth: varchar('expiry_month', { length: 2 }),
  expiryYear: varchar('expiry_year', { length: 4 }),
  isDefault: boolean('is_default').default(false),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
