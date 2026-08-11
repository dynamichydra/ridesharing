import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const promos = pgTable('promos', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  description: text('description'),
  discountType: varchar('discount_type', { length: 20 }).notNull(), // percentage | flat_amount
  discountValue: integer('discount_value').notNull(), // percentage int (e.g. 20) or minor units (e.g. 500 = $5.00)
  maxDiscountMinor: integer('max_discount_minor'), // optional cap for percentage discounts
  minFareMinor: integer('min_fare_minor').default(0).notNull(), // min fare required to apply
  usageLimit: integer('usage_limit'), // total overall usages allowed (null = unlimited)
  usedCount: integer('used_count').default(0).notNull(),
  perUserLimit: integer('per_user_limit').default(1).notNull(),
  validFrom: timestamp('valid_from').defaultNow().notNull(),
  validUntil: timestamp('valid_until'),
  countryId: uuid('country_id').references(() => countries.id), // null = all countries
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
