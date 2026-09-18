import { pgTable, uuid, varchar, decimal, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { matchingPolicyScopeEnum } from './enums.js';

/**
 * matching_policies
 *
 * Configurable, hierarchical matching policies:
 * Hierarchy resolution order: service_type → zone → city → country → global
 */
export const matchingPolicies = pgTable('matching_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  version: varchar('version', { length: 50 }).notNull().default('v1.0.0'),

  scope: matchingPolicyScopeEnum('scope').default('global').notNull(),
  // global | country | city | zone | service_type
  scopeId: uuid('scope_id'), // ID of Country, City, Zone, or VehicleType (null if global)
  serviceType: varchar('service_type', { length: 50 }), // e.g. economy, comfort, premium, xl

  initialRadiusKm: decimal('initial_radius_km', { precision: 5, scale: 2 }).notNull().default('1.50'),
  maxRadiusKm: decimal('max_radius_km', { precision: 5, scale: 2 }).notNull().default('15.00'),
  radiusStepKm: decimal('radius_step_km', { precision: 5, scale: 2 }).notNull().default('2.00'),

  offerTimeoutSeconds: integer('offer_timeout_seconds').notNull().default(15),
  maxWaves: integer('max_waves').notNull().default(4),
  maxCandidatesPerWave: integer('max_candidates_per_wave').notNull().default(5),
  cooldownSeconds: integer('cooldown_seconds').notNull().default(60),
  maxEtaMinutes: integer('max_eta_minutes').notNull().default(20),
  maxLocationAgeSeconds: integer('max_location_age_seconds').notNull().default(60),

  // Scorer feature weight overrides
  weights: jsonb('weights').default({
    etaWeight: 0.40,
    distanceWeight: 0.15,
    idleWeight: 0.10,
    ratingWeight: 0.10,
    acceptanceRateWeight: 0.10,
    cancellationRateWeight: 0.05,
    directionWeight: 0.05,
    zoneDemandWeight: 0.05,
  }),

  // Wave progression strategy: [ { wave: 1, topCount: 1, timeoutSec: 10 }, { wave: 2, topCount: 3, timeoutSec: 12 }, ... ]
  waveConfig: jsonb('wave_config').default([
    { wave: 1, topCount: 2, timeoutSec: 15 },
    { wave: 2, topCount: 3, timeoutSec: 15 },
    { wave: 3, topCount: 5, timeoutSec: 20 },
    { wave: 4, topCount: 10, timeoutSec: 25 },
  ]),

  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
