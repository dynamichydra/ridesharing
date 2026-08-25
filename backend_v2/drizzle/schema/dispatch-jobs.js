import { pgTable, uuid, varchar, timestamp, integer, jsonb, text } from 'drizzle-orm/pg-core';
import { rides } from './rides.js';
import { dispatchJobStatusEnum } from './enums.js';

/**
 * dispatch_jobs
 *
 * Tracks the end-to-end lifecycle of a driver matching / dispatch operation for a ride.
 * Keeps an auditable record of search attempts, wave progression, candidate pool sizes,
 * policy version used, and explainable matching diagnostics.
 */
export const dispatchJobs = pgTable('dispatch_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  rideId: uuid('ride_id').references(() => rides.id).notNull(),
  status: dispatchJobStatusEnum('status').default('pending').notNull(),
  // pending | searching | driver_offered | assigned | exhausted | cancelled | failed

  attempt: integer('attempt').default(1).notNull(),
  currentWave: integer('current_wave').default(1).notNull(),
  maxWaves: integer('max_waves').default(4).notNull(),
  policyVersion: varchar('policy_version', { length: 50 }).default('default_v1'),
  algorithmVersion: varchar('algorithm_version', { length: 50 }).default('hybrid_wave_v2'),

  candidateCount: integer('candidate_count').default(0),
  eligibleCandidateCount: integer('eligible_candidate_count').default(0),
  offeredCandidateCount: integer('offered_candidate_count').default(0),

  // Diagnostics: candidate evaluation funnel, score breakdowns, and exclusion reasons
  explainableData: jsonb('explainable_data').default({}),
  metadata: jsonb('metadata').default({}),

  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
  failureReason: text('failure_reason'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
