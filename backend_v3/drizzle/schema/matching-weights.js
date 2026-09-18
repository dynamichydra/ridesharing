import { pgTable, uuid, varchar, boolean, decimal, timestamp } from 'drizzle-orm/pg-core';

// Admin-configurable scoring weights for driver matching (see
// src/modules/matching/scoring.service.js). Only one row should be `isActive`
// at a time; getActiveWeights() caches the active row in Redis.
export const matchingWeights = pgTable('matching_weights', {
  id:                    uuid('id').primaryKey().defaultRandom(),
  name:                  varchar('name', { length: 60 }).notNull(),
  distanceWeight:        decimal('distance_weight', { precision: 4, scale: 3 }).notNull().default('0.500'),
  ratingWeight:          decimal('rating_weight', { precision: 4, scale: 3 }).notNull().default('0.300'),
  acceptanceRateWeight:  decimal('acceptance_rate_weight', { precision: 4, scale: 3 }).notNull().default('0.200'),
  isActive:              boolean('is_active').default(true),
  createdAt:             timestamp('created_at').defaultNow(),
  updatedAt:             timestamp('updated_at').defaultNow(),
});
