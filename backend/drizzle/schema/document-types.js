import { pgTable, uuid, varchar, boolean, integer } from 'drizzle-orm/pg-core';

export const documentTypes = pgTable('document_types', {
  id:                uuid('id').primaryKey().defaultRandom(),
  code:              varchar('code', { length: 60 }).unique().notNull(), // 'DRIVERS_LICENSE'
  requiresFront:     boolean('requires_front').default(true),
  requiresBack:      boolean('requires_back').default(false),
  requiresPdf:       boolean('requires_pdf').default(false),
  requiresExpiry:    boolean('requires_expiry').default(true),
  requiresDocNumber: boolean('requires_doc_number').default(true),
  maxFileSizeMb:     integer('max_file_size_mb').default(10),
  isActive:          boolean('is_active').default(true),
  sortOrder:         integer('sort_order').default(0),
});
