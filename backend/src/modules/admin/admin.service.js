import { eq, count, desc, and, gte, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers, users, rides, subscriptions, auditLogs } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function getDashboardStats() {
  const [[driverTotal], [riderTotal], [rideTotal], [subTotal]] = await Promise.all([
    db.select({ total: count() }).from(drivers),
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(rides),
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, 'active')),
  ]);

  const [pending] = await db.select({ total: count() }).from(drivers)
    .where(eq(drivers.approvalStatus, 'pending'));
  const [online]  = await db.select({ total: count() }).from(drivers)
    .where(eq(drivers.isOnline, true));

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const [todayRides] = await db.select({ total: count() }).from(rides)
    .where(gte(rides.requestedAt, todayStart));
  const [todayCompleted] = await db.select({ total: count() }).from(rides)
    .where(and(eq(rides.status, 'completed'), gte(rides.requestedAt, todayStart)));

  return {
    drivers:  { total: driverTotal.total, pendingApproval: pending.total, online: online.total },
    riders:   { total: riderTotal.total },
    rides:    { total: rideTotal.total, today: todayRides.total, todayCompleted: todayCompleted.total },
    subscriptions: { active: subTotal.total },
  };
}

export async function getRideStats(days = 30) {
  const from = new Date(Date.now() - days * 86400000);
  const rows = await db.execute(sql`
    SELECT
      DATE(requested_at) AS date,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
      COUNT(*) FILTER (WHERE status = 'expired')   AS expired,
      COUNT(*)                                      AS total
    FROM rides
    WHERE requested_at >= ${from}
    GROUP BY DATE(requested_at)
    ORDER BY date ASC
  `);
  return rows;
}

export async function getSubscriptionStats() {
  const rows = await db.execute(sql`
    SELECT
      sp.name  AS plan_name,
      sp.type  AS plan_type,
      sp.price_minor,
      sp.currency_code,
      COUNT(s.id)                                    AS total_subscriptions,
      COUNT(s.id) FILTER (WHERE s.status = 'active') AS active_count
    FROM subscription_plans sp
    LEFT JOIN subscriptions s ON s.plan_id = sp.id
    GROUP BY sp.id, sp.name, sp.type, sp.price_minor, sp.currency_code
    ORDER BY total_subscriptions DESC
  `);
  return rows;
}

export async function listAuditLogs(page, limit, offset, filters = {}) {
  const conditions = [];
  if (filters.actorType) conditions.push(eq(auditLogs.actorType, filters.actorType));
  if (filters.action)    conditions.push(eq(auditLogs.action,    filters.action));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(auditLogs).where(where);
  const rows = await db.select().from(auditLogs).where(where)
    .orderBy(desc(auditLogs.createdAt)).limit(limit).offset(offset);
  return { rows, pagination: paginate(page, limit, total) };
}

export async function writeAuditLog(entry) {
  return db.insert(auditLogs).values(entry).returning();
}
