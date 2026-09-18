import { pgTable, uuid, varchar, integer, decimal, text, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { admins } from './admins.js';

// A completed trip whose GPS-derived actual fare exceeded its upfront estimate
// by more than the configured deviation tolerance (20% at launch — see
// finalize-trip.job.js). Never auto-billed past the estimate; sits here pending
// manual review instead.
export const flaggedTrips = pgTable('flagged_trips', {
  id:                  uuid('id').primaryKey().defaultRandom(),
  rideId:              uuid('ride_id').references(() => rides.id).notNull(),
  reason:              varchar('reason', { length: 60 }).notNull(), // e.g. 'fare_deviation'
  estimatedFareMinor:  integer('estimated_fare_minor').notNull(),
  actualFareMinor:     integer('actual_fare_minor').notNull(),
  deviationPct:        decimal('deviation_pct', { precision: 6, scale: 2 }).notNull(),
  status:              varchar('status', { length: 20 }).default('pending_review').notNull(),
  // pending_review | approved | adjusted
  adjustedFareMinor:   integer('adjusted_fare_minor'), // set if an admin manually adjusts the final bill
  reviewNote:          text('review_note'),
  reviewedBy:          uuid('reviewed_by').references(() => admins.id),
  reviewedAt:          timestamp('reviewed_at'),
  createdAt:           timestamp('created_at').defaultNow(),
});
