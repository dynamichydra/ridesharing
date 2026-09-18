import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { legalDocuments } from './legal-documents.js';

export const driverLegalAcceptances = pgTable('driver_legal_acceptances', {
  id:              uuid('id').primaryKey().defaultRandom(),
  driverId:        uuid('driver_id').references(() => drivers.id).notNull(),
  legalDocumentId: uuid('legal_document_id').references(() => legalDocuments.id).notNull(),
  acceptedAt:      timestamp('accepted_at').defaultNow(),
  ip:              varchar('ip', { length: 45 }),
  userAgent:       text('user_agent'),
});
