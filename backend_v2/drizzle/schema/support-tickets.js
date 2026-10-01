import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { supportCategories } from './support-categories.js';
import { rides } from './rides.js';
import { admins } from './admins.js';

export const supportTickets = pgTable('support_tickets', {
  id:             uuid('id').primaryKey().defaultRandom(),
  ticketNumber:   varchar('ticket_number', { length: 30 }).notNull().unique(), // e.g. TCK-2026-894012
  userType:       varchar('user_type', { length: 10 }).notNull(), // 'rider' | 'driver'
  userId:         uuid('user_id').notNull(),
  categoryId:     uuid('category_id').references(() => supportCategories.id).notNull(),
  rideId:         uuid('ride_id').references(() => rides.id), // Nullable for account/wallet tickets

  subject:        varchar('subject', { length: 200 }).notNull(),
  status:         varchar('status', { length: 20 }).default('open').notNull(),
                  // 'open' | 'assigned' | 'pending_user' | 'resolved' | 'closed'
  priority:       varchar('priority', { length: 15 }).default('medium').notNull(),
                  // 'low' | 'medium' | 'high' | 'urgent'

  assignedAdminId: uuid('assigned_admin_id').references(() => admins.id),
  assignedAt:     timestamp('assigned_at'),

  firstRespondedAt: timestamp('first_responded_at'),
  slaDueAt:       timestamp('sla_due_at').notNull(), // Targeted resolution deadline
  slaBreached:    boolean('sla_breached').default(false).notNull(),

  resolvedAt:     timestamp('resolved_at'),
  closedAt:       timestamp('closed_at'),

  createdAt:      timestamp('created_at').defaultNow(),
  updatedAt:      timestamp('updated_at').defaultNow(),
});
