import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';

export const admins = pgTable('admins', {
  id:          uuid('id').primaryKey().defaultRandom(),
  email:       varchar('email', { length: 255 }).unique().notNull(),
  password:    text('password').notNull(),                 // bcrypt hash
  name:        varchar('name', { length: 100 }).notNull(),
  role:        varchar('role', { length: 30 }).default('admin'), // super_admin | admin
  isActive:    boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow(),
});
