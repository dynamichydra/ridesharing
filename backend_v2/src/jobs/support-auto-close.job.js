import { db } from '../config/db.js';
import { supportTickets, supportTicketMessages } from '../../drizzle/schema/index.js';
import { eq, and, lt } from 'drizzle-orm';
import { publishEvent, TOPICS } from '../config/kafka.js';

export async function autoCloseInactiveSupportTickets() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
  const inactiveTickets = await db.select()
    .from(supportTickets)
    .where(
      and(
        eq(supportTickets.status, 'pending_user'),
        lt(supportTickets.updatedAt, cutoff)
      )
    );

  let closedCount = 0;
  for (const ticket of inactiveTickets) {
    const now = new Date();
    await db.update(supportTickets)
      .set({
        status: 'closed',
        closedAt: now,
        updatedAt: now,
      })
      .where(eq(supportTickets.id, ticket.id));

    // Insert system message indicating auto-closure
    await db.insert(supportTicketMessages).values({
      ticketId: ticket.id,
      senderType: 'system',
      messageType: 'system_event',
      content: 'Ticket automatically closed due to 48 hours of user inactivity.',
      isInternalNote: false,
      isReadByUser: true,
      isReadByAgent: true,
    });

    closedCount++;

    await publishEvent(TOPICS.SUPPORT_TICKET_UPDATED, {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      oldStatus: 'pending_user',
      newStatus: 'closed',
      updatedBy: 'system_auto_close',
      closedAt: now,
    }, ticket.id);
  }

  return closedCount;
}
