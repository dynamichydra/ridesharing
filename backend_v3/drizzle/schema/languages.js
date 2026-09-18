import { pgTable, varchar, boolean } from 'drizzle-orm/pg-core';

export const languages = pgTable('languages', {
  code:       varchar('code', { length: 8 }).primaryKey(),   // "en", "hi", "es-MX"
  name:       varchar('name', { length: 60 }).notNull(),
  nativeName: varchar('native_name', { length: 60 }).notNull(),
  isRtl:      boolean('is_rtl').default(false),
  isActive:   boolean('is_active').default(true),
  isDefault:  boolean('is_default').default(false),
});
