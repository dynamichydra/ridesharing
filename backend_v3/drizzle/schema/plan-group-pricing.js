import { pgTable, uuid, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { subscriptionPlans } from './subscription-plans.js';
import { driverGroups } from './driver-groups.js';

export const planGroupPricing = pgTable('plan_group_pricing', {
  id:                uuid('id').primaryKey().defaultRandom(),
  planId:            uuid('plan_id').references(() => subscriptionPlans.id).notNull(),
  groupId:           uuid('group_id').references(() => driverGroups.id).notNull(),
  specialPriceMinor: integer('special_price_minor'), // fixed override price (e.g. 2000 minor units instead of 5000)
  discountPercent:   integer('discount_percent'),     // or percentage discount (e.g. 25 = 25% off)
  startDate:         timestamp('start_date'),         // optional scheduling
  endDate:           timestamp('end_date'),
  isActive:          boolean('is_active').default(true),
  createdAt:         timestamp('created_at').defaultNow(),
  updatedAt:         timestamp('updated_at').defaultNow(),
});
