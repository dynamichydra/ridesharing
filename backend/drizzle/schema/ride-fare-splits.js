import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { users } from './users.js';

export const rideFareSplits = pgTable('ride_fare_splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  inviterId: uuid('inviter_id').references(() => users.id).notNull(),
  inviteeId: uuid('invitee_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | accepted | declined | cancelled | expired
  splitAmountMinor: integer('split_amount_minor'), // calculated at completion or request time
  paymentStatus: varchar('payment_status', { length: 20 }).default('pending').notNull(), // pending | paid | failed
  paymentMethod: varchar('payment_method', { length: 20 }), // online | wallet | cash
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

