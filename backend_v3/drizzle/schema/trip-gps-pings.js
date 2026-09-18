import { pgTable, uuid, decimal, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { drivers } from './drivers.js';

// Durable GPS ping history for a trip — the audit source for actual (as opposed
// to estimated) billed distance/time, and for dispute resolution. Buffered in
// Redis per-ride (ride:gps:buffer:{rideId}) during the trip and batch-inserted
// here by a BullMQ worker (src/jobs/index.js) rather than one INSERT per ping.
export const tripGpsPings = pgTable('trip_gps_pings', {
  id:         uuid('id').primaryKey().defaultRandom(),
  rideId:     uuid('ride_id').references(() => rides.id).notNull(),
  driverId:   uuid('driver_id').references(() => drivers.id).notNull(),
  lat:        decimal('lat', { precision: 10, scale: 8 }).notNull(),
  lng:        decimal('lng', { precision: 11, scale: 8 }).notNull(),
  accuracy:   decimal('accuracy', { precision: 6, scale: 2 }),   // meters, from device GPS
  speedKmh:   decimal('speed_kmh', { precision: 6, scale: 2 }),  // device-reported instantaneous speed, if available
  recordedAt: timestamp('recorded_at').notNull(),   // client-side capture time
  receivedAt: timestamp('received_at').defaultNow().notNull(), // server receipt time
  isNoise:    boolean('is_noise').default(false),   // failed accuracy/speed-jump filter — excluded from distance calc
  gapFlag:    boolean('gap_flag').default(false),    // time delta since previous valid ping exceeded the gap threshold
  createdAt:  timestamp('created_at').defaultNow(),
});
