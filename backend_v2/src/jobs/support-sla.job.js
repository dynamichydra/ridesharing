import { db } from '../config/db.js';
import { supportTickets } from '../../drizzle/schema/index.js';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { publishEvent, TOPICS } from '../config/kafka.js';
import { broadcastToAdmin } from '../sockets/index.js';

export async function checkSupportSlaBreaches() {
  const now = new Date();
  const breachedTickets = await db.select()
    .from(supportTickets)
    .where(
      and(
        inArray(supportTickets.status, ['open', 'assigned']),
        lt(supportTickets.slaDueAt, now),
        eq(supportTickets.slaBreached, false)
      )
    );

  let updatedCount = 0;
  for (const ticket of breachedTickets) {
    await db.update(supportTickets)
      .set({ slaBreached: true, updatedAt: now })
      .where(eq(supportTickets.id, ticket.id));

    updatedCount++;

    const payload = {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      userId: ticket.userId,
      userType: ticket.userType,
      priority: ticket.priority,
      slaDueAt: ticket.slaDueAt,
      breachedAt: now,
    };

    await publishEvent(TOPICS.SUPPORT_SLA_BREACHED, payload, ticket.id);
    broadcastToAdmin('support:sla_breached', payload);
  }

  return updatedCount;
}
