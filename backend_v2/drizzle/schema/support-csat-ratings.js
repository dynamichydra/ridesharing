import { pgTable, uuid, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { supportTickets } from './support-tickets.js';

export const supportCsatRatings = pgTable('support_csat_ratings', {
  id:         uuid('id').primaryKey().defaultRandom(),
  ticketId:   uuid('ticket_id').references(() => supportTickets.id).notNull().unique(),
  rating:     integer('rating').notNull(), // 1 to 5 stars
  feedback:   text('feedback'),
  tags:       text('tags'), // Comma-separated feedback tags (e.g. 'Fast response', 'Polite', 'Unresolved')
  createdAt:  timestamp('created_at').defaultNow(),
});
