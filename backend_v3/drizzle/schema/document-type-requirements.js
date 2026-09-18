import { pgTable, uuid, boolean } from 'drizzle-orm/pg-core';
import { documentTypes } from './document-types.js';
import { countries } from './countries.js';
import { cities } from './cities.js';
import { vehicleTypes } from './vehicle-types.js';

// Lets admin scope "which documents are required" per country / city / vehicle type.
// A null scope column means "applies to all" at that level.
export const documentTypeRequirements = pgTable('document_type_requirements', {
  id:             uuid('id').primaryKey().defaultRandom(),
  documentTypeId: uuid('document_type_id').references(() => documentTypes.id).notNull(),
  countryId:      uuid('country_id').references(() => countries.id),       // null = all countries
  cityId:         uuid('city_id').references(() => cities.id),             // null = all cities in country
  vehicleTypeId:  uuid('vehicle_type_id').references(() => vehicleTypes.id), // null = all vehicle types
  isRequired:     boolean('is_required').default(true),
});
