import { pgTable, uuid, varchar, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';
import { zones } from './zones.js';
import { drivers } from './drivers.js';
import { vehicleTypes } from './vehicle-types.js';
import { airportQueueStatusEnum, airportQueueEntryStatusEnum } from './enums.js';

/**
 * airport_queues
 *
 * Configured queue holding zones for airports and major transit hubs.
 */
export const airportQueues = pgTable('airport_queues', {
  id: uuid('id').primaryKey().defaultRandom(),
  zoneId: uuid('zone_id').references(() => zones.id).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull(),
  code: varchar('code', { length: 20 }).notNull(), // e.g. CCU, DEL, BOM
  status: airportQueueStatusEnum('status').default('active').notNull(),
  // active | paused | closed

  maxCapacity: integer('max_capacity').default(500),
  fifoStrict: boolean('fifo_strict').default(true),
  heartbeatTimeoutSec: integer('heartbeat_timeout_sec').default(120),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * airport_queue_entries
 *
 * Real-time queue entries for drivers waiting in airport geofenced zones.
 */
export const airportQueueEntries = pgTable('airport_queue_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  queueId: uuid('queue_id').references(() => airportQueues.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id).notNull(),
  vehicleTypeId: uuid('vehicle_type_id').references(() => vehicleTypes.id),

  queuePosition: integer('queue_position').notNull(),
  status: airportQueueEntryStatusEnum('status').default('waiting').notNull(),
  // waiting | offered | dispatched | paused | left | timed_out

  enteredAt: timestamp('entered_at').defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  leftAt: timestamp('left_at'),

  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
