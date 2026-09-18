import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, text } from 'drizzle-orm/pg-core';

export const cityTypes = pgTable('city_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(), // e.g. TIER_1_METRO, TIER_2_URBAN, TIER_3_REGIONAL, TOURIST_HUB
  name: varchar('name', { length: 100 }).notNull(),          // e.g. "Tier-1 Metro / High Cost"
  description: text('description'),

  // Fare Calculation & Economic Parameters
  costIndex: decimal('cost_index', { precision: 4, scale: 2 }).default('1.00'), // Economic factor multiplier baseline
  densityLevel: varchar('density_level', { length: 30 }).default('medium'),        // high | medium | low | rural (used for candidate search radius)
  defaultSurgeCap: decimal('default_surge_cap', { precision: 4, scale: 2 }).default('3.00'), // Max surge multiplier allowed in this tier
  waitingFeeEnabled: boolean('waiting_fee_enabled').default(true),                      // Whether traffic wait time fees apply

  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
