import { pgTable, uuid, varchar, boolean, timestamp, decimal, integer, jsonb } from 'drizzle-orm/pg-core';

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  // type is fully dynamic — admin can define any: monthly, quarterly, yearly, lifetime, custom
  type: varchar('type', { length: 50 }).notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  durationDays: integer('duration_days'),      // null = lifetime
  trialDays: integer('trial_days').default(0),
  features: jsonb('features'),             // string[]
  vehicleTypeIds: jsonb('vehicle_type_ids'),     // uuid[] — which vehicle types this plan allows
  maxRidesPerDay: integer('max_rides_per_day'),  // null = unlimited
  sortOrder: integer('sort_order').default(0),
  isActive: boolean('is_active').default(true),
  razorpayPlanId: varchar('razorpay_plan_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
