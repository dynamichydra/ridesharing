import { pgTable, uuid, varchar, timestamp, text, jsonb } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { drivers } from './drivers.js';
import { dispatchJobs } from './dispatch-jobs.js';
import { rideOffers } from './ride_offers.js';
import { assignmentStatusEnum, assignmentTypeEnum } from './enums.js';

/**
 * ride_driver_assignments
 *
 * Durable history of all driver assignments, reassignments, and unassignments for rides.
 * Prevents relying solely on `rides.driver_id` and enables thorough auditing.
 */
export const rideDriverAssignments = pgTable('ride_driver_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  driverId: uuid('driver_id').references(() => drivers.id).notNull(),
  dispatchJobId: uuid('dispatch_job_id').references(() => dispatchJobs.id),
  offerId: uuid('offer_id').references(() => rideOffers.id),

  assignmentType: assignmentTypeEnum('assignment_type').default('automatic').notNull(),
  // automatic | manual | reassign | airport_queue | reservation
  status: assignmentStatusEnum('status').default('active').notNull(),
  // active | completed | cancelled_by_driver | cancelled_by_rider | cancelled_by_admin | reassigned

  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  unassignedAt: timestamp('unassigned_at'),
  reason: text('reason'),
  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});
