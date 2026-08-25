import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { rides } from './rides.js';
import { reservationStatusEnum } from './enums.js';

/**
 * driver_reservations
 *
 * Tracks capacity reservations on drivers for future scheduled bookings, preventing
 * double-dispatching during scheduled trip windows.
 */
export const driverReservations = pgTable('driver_reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  driverId: uuid('driver_id').references(() => drivers.id).notNull(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),

  windowStart: timestamp('window_start').notNull(),
  windowEnd: timestamp('window_end').notNull(),
  status: reservationStatusEnum('status').default('confirmed').notNull(),
  // pending | confirmed | cancelled | fulfilled | expired

  reservedAt: timestamp('reserved_at').defaultNow().notNull(),
  releasedAt: timestamp('released_at'),
  releaseReason: text('release_reason'),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
