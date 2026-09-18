import { pgTable, uuid, varchar, timestamp, jsonb, text } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';

/**
 * ride_status_history
 *
 * Append-only log of every status transition a ride goes through.
 * Lets admin/support reconstruct exactly what happened and when,
 * independent of the (mutable) current state on the `rides` row.
 *
 * Example row sequence for a normal completed ride:
 *   searching → accepted → arriving → started → completed
 *
 * Example for a ride that needed driver re-matching:
 *   searching → accepted → searching (driver cancelled) → accepted → started → completed
 */
export const rideStatusHistory = pgTable('ride_status_history', {
    id: uuid('id').primaryKey().defaultRandom(),
    rideId: uuid('ride_id').references(() => rides.id).notNull(),
    fromStatus: varchar('from_status', { length: 20 }),
    toStatus: varchar('to_status', { length: 20 }).notNull(),
    changedBy: varchar('changed_by', { length: 20 }),
    changedById: uuid('changed_by_id'),
    reason: text('reason'),
    meta: jsonb('meta'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
});