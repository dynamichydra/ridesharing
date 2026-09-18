import { pgTable, uuid, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { drivers } from './drivers.js';
import { documentTypes } from './document-types.js';
import { admins } from './admins.js';

export const driverDocuments = pgTable('driver_documents', {
  id:              uuid('id').primaryKey().defaultRandom(),
  driverId:        uuid('driver_id').references(() => drivers.id).notNull(),
  documentTypeId:  uuid('document_type_id').references(() => documentTypes.id).notNull(),
  frontUrl:        text('front_url'),
  backUrl:         text('back_url'),
  pdfUrl:          text('pdf_url'),
  documentNumber:  varchar('document_number', { length: 60 }),
  expiryDate:      timestamp('expiry_date'),
  status:          varchar('status', { length: 20 }).default('pending'), // pending | approved | rejected | expired
  rejectionReason: text('rejection_reason'),
  verifiedBy:      uuid('verified_by').references(() => admins.id),
  verifiedAt:      timestamp('verified_at'),
  uploadedAt:      timestamp('uploaded_at').defaultNow(),
}, (t) => ([
  unique().on(t.driverId, t.documentTypeId),
]));
