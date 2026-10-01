import { db } from '../config/db.js';
import { supportTickets, supportCsatRatings, notifications } from '../../drizzle/schema/index.js';
import { eq, and, lt, isNull } from 'drizzle-orm';
import { publishEvent, TOPICS } from '../config/kafka.js';

export async function sendCsatReminders() {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  
  // Find tickets resolved over 2 hours ago that have no CSAT rating
  const pendingCsatTickets = await db.select({
    ticket: supportTickets,
  })
    .from(supportTickets)
    .leftJoin(supportCsatRatings, eq(supportTickets.id, supportCsatRatings.ticketId))
    .where(
      and(
        eq(supportTickets.status, 'resolved'),
        lt(supportTickets.resolvedAt, twoHoursAgo),
        isNull(supportCsatRatings.id)
      )
    );

  let remindedCount = 0;
  for (const { ticket } of pendingCsatTickets) {
    if (!ticket) continue;

    // Send push notification to user
    await db.insert(notifications).values({
      userId: ticket.userId,
      userType: ticket.userType,
      title: 'How was your support experience?',
      body: `Please rate your support experience for ticket #${ticket.ticketNumber}.`,
      data: {
        type: 'SUPPORT_CSAT_REMINDER',
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
      },
    }).catch(() => {});

    await publishEvent(TOPICS.NOTIF_PUSH, {
      userId: ticket.userId,
      userType: ticket.userType,
      title: 'How was your support experience?',
      body: `Please rate your support experience for ticket #${ticket.ticketNumber}.`,
      data: { type: 'SUPPORT_CSAT_REMINDER', ticketId: ticket.id },
    });

    remindedCount++;
  }

  return remindedCount;
}
