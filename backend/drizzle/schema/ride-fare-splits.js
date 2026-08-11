import { pgTable, uuid, varchar, timestamp, integer } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { users } from './users.js';

export const rideFareSplits = pgTable('ride_fare_splits', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  inviterId: uuid('inviter_id').references(() => users.id).notNull(),
  inviteeId: uuid('invitee_id').references(() => users.id).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending | accepted | declined | cancelled
  splitAmountMinor: integer('split_amount_minor'), // calculated at completion
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
