import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { countries } from './countries.js';

export const legalEntities = pgTable('legal_entities', {
  id:                 uuid('id').primaryKey().defaultRandom(),
  name:               varchar('name', { length: 150 }).notNull(), // e.g. "RideShare India Technologies Pvt Ltd"
  countryId:          uuid('country_id').references(() => countries.id).notNull(),
  currencyCode:       varchar('currency_code', { length: 3 }).notNull(),
  registrationNumber: varchar('registration_number', { length: 100 }),
  taxNumber:          varchar('tax_number', { length: 100 }),
  address:            text('address'),
  status:             varchar('status', { length: 20 }).default('active').notNull(),
  createdAt:          timestamp('created_at').defaultNow().notNull(),
  updatedAt:          timestamp('updated_at').defaultNow().notNull(),
});
