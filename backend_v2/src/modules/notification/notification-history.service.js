import { eq, and, desc, count } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { notifications } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function listForUser(userId, userType, page, limit, offset) {
  const where = and(eq(notifications.userId, userId), eq(notifications.userType, userType));
  const [{ total }] = await db.select({ total: count() }).from(notifications).where(where);
  const rows = await db.select().from(notifications).where(where)
    .orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function getUnreadCount(userId, userType) {
  const [{ unread }] = await db.select({ unread: count() }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.userType, userType), eq(notifications.isRead, false)));
  return unread;
}

export async function markRead(id, userId, userType) {
  const [row] = await db.update(notifications)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId), eq(notifications.userType, userType)))
    .returning();
  if (!row) throw { statusCode: 404, message: 'Notification not found' };
  return row;
}

// ── Admin (support lookup) ─────────────────────────────────────────────────────

export async function listForAdmin(filters, page, limit, offset) {
  const conditions = [];
  if (filters.userId) conditions.push(eq(notifications.userId, filters.userId));
  if (filters.userType) conditions.push(eq(notifications.userType, filters.userType));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(notifications).where(where);
  const rows = await db.select().from(notifications).where(where)
    .orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}
