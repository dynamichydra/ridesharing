import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { users } from './users.js';

export const tripShareTokens = pgTable('trip_share_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  riderId: uuid('rider_id').references(() => users.id).notNull(),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
