import { pgTable, uuid, varchar, timestamp, decimal, integer, text, smallint, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { drivers } from './drivers.js';
import { vehicleTypes } from './vehicle-types.js';

export const rides = pgTable('rides', {
  id: uuid('id').primaryKey().defaultRandom(),
  riderId: uuid('rider_id').references(() => users.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id).notNull(),
  pickupLat: decimal('pickup_lat', { precision: 10, scale: 8 }).notNull(),
  pickupLng: decimal('pickup_lng', { precision: 11, scale: 8 }).notNull(),
  pickupAddress: text('pickup_address'),
  dropLat: decimal('drop_lat', { precision: 10, scale: 8 }).notNull(),
  dropLng: decimal('drop_lng', { precision: 11, scale: 8 }).notNull(),
  dropAddress: text('drop_address'),
  fareSnapshot: jsonb('fare_snapshot'),         // full breakdown stored at ride time
  estimatedFare: decimal('estimated_fare', { precision: 10, scale: 2 }),
  finalFare: decimal('final_fare', { precision: 10, scale: 2 }),
  distanceKm: decimal('distance_km', { precision: 8, scale: 3 }),
  durationMin: integer('duration_min'),
  polyline: text('polyline'),               // encoded Google route
  status: varchar('status').default('requested'),
  // requested | searching | accepted | arriving | started | completed | cancelled | expired
  cancelledBy: varchar('cancelled_by'),        // rider | driver | system
  cancelReason: text('cancel_reason'),
  riderRating: smallint('rider_rating'),       // driver rates rider
  driverRating: smallint('driver_rating'),      // rider rates driver
  riderReview: text('rider_review'),
  driverReview: text('driver_review'),
  requestedAt: timestamp('requested_at').defaultNow(),
  acceptedAt: timestamp('accepted_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  cancelledAt: timestamp('cancelled_at'),
});
