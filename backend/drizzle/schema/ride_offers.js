import { pgTable, uuid, varchar, timestamp, decimal, integer, text } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { drivers } from './drivers.js';

/**
 * ride_offers
 *
 * One row is created per driver every time the matching engine notifies them
 * about a ride (one row per ring per driver). This gives a full audit trail of
 * who was offered the ride, when, at what distance/ring, and how they responded.
 *
 * Lifecycle of a single offer:
 *   pending   → ride just broadcast to this driver, awaiting response
 *   accepted  → this driver accepted (ride.driverId gets set to this driver)
 *   rejected  → driver explicitly declined
 *   expired   → ring timeout passed with no response
 *   superseded→ another driver accepted the ride first (this offer auto-closed)
 */
export const rideOffers = pgTable('ride_offers', {
    id: uuid('id').primaryKey().defaultRandom(),
    rideId: uuid('ride_id').references(() => rides.id).notNull(),
    driverId: uuid('driver_id').references(() => drivers.id),   // null until matched — kept nullable per spec
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    // pending | accepted | rejected | expired | superseded

    ring: integer('ring'),                  // which matching ring (1, 2, 3...)
    radiusKm: decimal('radius_km', { precision: 5, scale: 2 }),  // ring radius at offer time
    distanceKm: decimal('distance_km', { precision: 6, scale: 3 }), // driver→pickup distance when offered
    driverRatingAtOffer: decimal('driver_rating_at_offer', { precision: 3, scale: 2 }),
    score: decimal('score', { precision: 8, scale: 5 }),     // matching score at offer time

    offeredAt: timestamp('offered_at').defaultNow().notNull(),
    respondedAt: timestamp('responded_at'),         // when driver accepted/rejected
    expiresAt: timestamp('expires_at'),           // ring deadline for this offer
    rejectReason: text('reject_reason'),             // optional, if driver declines with a reason

    createdAt: timestamp('created_at').defaultNow(),
});