import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { drivers } from './drivers.js';

// Hard exclusion pairs — a rider/driver pair in this table is never offered to
// each other again (a prior negative interaction), unlike normal scoring which
// only downranks. Checked as a NOT-IN filter alongside the existing
// already-tried-this-ring exclusion in matching.service.js.
export const driverRiderBlocks = pgTable('driver_rider_blocks', {
  id:        uuid('id').primaryKey().defaultRandom(),
  riderId:   uuid('rider_id').references(() => users.id).notNull(),
  driverId:  uuid('driver_id').references(() => drivers.id).notNull(),
  reason:    text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ([
  unique().on(t.riderId, t.driverId),
]));
