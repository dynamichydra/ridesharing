import { pgTable, uuid, varchar, timestamp, decimal, integer, text, jsonb } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { drivers } from './drivers.js';

/**
 * ride_offers
 *
 * One row is created per driver every time the matching engine notifies them
 * about a ride (one row per ring/wave per driver). This gives a full audit trail of
 * who was offered the ride, when, at what distance/ring/wave, and how they responded.
 *
 * Lifecycle of a single offer:
 *   pending   → ride broadcast to this driver, awaiting response
 *   accepted  → this driver accepted (atomic DB assignment succeeds)
 *   rejected  → driver explicitly declined (with optional reason code)
 *   expired   → wave timeout passed with no response
 *   superseded→ another driver accepted first (offer auto-closed)
 *   cancelled → rider cancelled during offer window
 */
export const rideOffers = pgTable('ride_offers', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),
  dispatchJobId: uuid('dispatch_job_id'), // optional link to dispatch_jobs

  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // pending | accepted | rejected | expired | superseded | cancelled

  wave: integer('wave').default(1),
  ring: integer('ring').default(1),
  rank: integer('rank').default(1),

  radiusKm: decimal('radius_km', { precision: 5, scale: 2 }),
  distanceKm: decimal('distance_km', { precision: 6, scale: 3 }),
  etaSeconds: integer('eta_seconds'),
  driverRatingAtOffer: decimal('driver_rating_at_offer', { precision: 3, scale: 2 }),
  score: decimal('score', { precision: 8, scale: 5 }),
  scoreBreakdown: jsonb('score_breakdown').default({}),

  offeredAt: timestamp('offered_at').defaultNow().notNull(),
  openedAt: timestamp('opened_at'),
  respondedAt: timestamp('responded_at'),
  expiresAt: timestamp('expires_at'),
  rejectReason: text('reject_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});