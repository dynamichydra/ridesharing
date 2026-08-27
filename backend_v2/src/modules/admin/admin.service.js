import { eq, count, desc, and, gte, sql, or } from 'drizzle-orm';
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
  const result = await db.execute(sql`
    SELECT
      DATE(requested_at) AS date,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
      COUNT(*) FILTER (WHERE status = 'expired')::int   AS expired,
      COUNT(*)::int                                    AS total
    FROM rides
    WHERE requested_at >= ${from}
    GROUP BY DATE(requested_at)
    ORDER BY date ASC
  `);
  return result.rows ?? result;
}

export async function getSubscriptionStats(pageOrOptions = {}, maybeLimit, maybeOffset, maybeFilters = {}, maybeSort = {}) {
  let page = 1;
  let limit = 20;
  let offset = 0;
  let filters = {};
  let sort = {};

  if (pageOrOptions && typeof pageOrOptions === 'object' && !Array.isArray(pageOrOptions)) {
    page = pageOrOptions.page ? Number(pageOrOptions.page) : 1;
    limit = pageOrOptions.limit ? Number(pageOrOptions.limit) : 20;
    offset = pageOrOptions.offset !== undefined ? Number(pageOrOptions.offset) : (page - 1) * limit;
    filters = pageOrOptions.filters || {};
    sort = pageOrOptions.sort || {
      sortBy: pageOrOptions.sortBy,
      sortOrder: pageOrOptions.sortOrder || pageOrOptions.order,
    };
  } else {
    page = pageOrOptions ? Number(pageOrOptions) : 1;
    limit = maybeLimit ? Number(maybeLimit) : 20;
    offset = maybeOffset !== undefined ? Number(maybeOffset) : (page - 1) * limit;
    filters = maybeFilters || {};
    sort = maybeSort || {};
  }

  const conditions = [];

  if (filters.countryId) {
    conditions.push(sql`sp.country_id = ${filters.countryId}`);
  }
  if (filters.planType || filters.type) {
    conditions.push(sql`sp.type = ${filters.planType || filters.type}`);
  }
  if (filters.currencyCode) {
    conditions.push(sql`sp.currency_code = ${filters.currencyCode}`);
  }
  if (filters.isActive !== undefined && filters.isActive !== null && filters.isActive !== '') {
    const activeBool = typeof filters.isActive === 'boolean' ? filters.isActive : String(filters.isActive) === 'true';
    conditions.push(sql`sp.is_active = ${activeBool}`);
  }
  if (filters.search || filters.planName) {
    const searchTerm = `%${filters.search || filters.planName}%`;
    conditions.push(sql`sp.name ILIKE ${searchTerm}`);
  }

  const whereClause = conditions.length > 0
    ? sql`WHERE ${sql.join(conditions, sql` AND `)}`
    : sql``;

  // 1. Total matching plans count for pagination
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM subscription_plans sp
    ${whereClause}
  `);
  const countRows = countResult.rows ?? countResult;
  const total = Number(countRows[0]?.total || 0);

  // 2. Sorting
  const sortMap = {
    total_subscriptions: sql`total_subscriptions`,
    active_count: sql`active_count`,
    cancelled_count: sql`cancelled_count`,
    expired_count: sql`expired_count`,
    plan_name: sql`sp.name`,
    name: sql`sp.name`,
    plan_type: sql`sp.type`,
    type: sql`sp.type`,
    price_minor: sql`sp.price_minor`,
    price: sql`sp.price_minor`,
    currency_code: sql`sp.currency_code`,
    is_active: sql`sp.is_active`,
    created_at: sql`sp.created_at`,
  };

  const sortByField = String(sort?.sortBy || '').toLowerCase();
  const sortColumn = sortMap[sortByField] || sql`total_subscriptions`;
  const isAsc = String(sort?.sortOrder || sort?.order || '').toLowerCase() === 'asc';
  const orderDirection = isAsc ? sql`ASC` : sql`DESC`;

  // 3. Data query
  const dataResult = await db.execute(sql`
    SELECT
      sp.id                                                  AS plan_id,
      sp.name                                                AS plan_name,
      sp.type                                                AS plan_type,
      sp.price_minor,
      sp.currency_code,
      sp.country_id,
      sp.is_active,
      COUNT(s.id)::int                                       AS total_subscriptions,
      COUNT(s.id) FILTER (WHERE s.status = 'active')::int    AS active_count,
      COUNT(s.id) FILTER (WHERE s.status = 'cancelled')::int AS cancelled_count,
      COUNT(s.id) FILTER (WHERE s.status = 'expired')::int   AS expired_count
    FROM subscription_plans sp
    LEFT JOIN subscriptions s ON s.plan_id = sp.id
    ${whereClause}
    GROUP BY sp.id, sp.name, sp.type, sp.price_minor, sp.currency_code, sp.country_id, sp.is_active
    ORDER BY ${sortColumn} ${orderDirection}
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  const rows = dataResult.rows ?? dataResult;

  return {
    rows,
    pagination: paginate(page, limit, total),
  };
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

export async function getSupplyDemandHeatmap() {
  const onlineDrivers = await db.select({
    id: drivers.id,
    name: drivers.name,
    currentLat: drivers.currentLat,
    currentLng: drivers.currentLng,
    lastLocationAt: drivers.lastLocationAt,
  }).from(drivers).where(eq(drivers.isOnline, true));

  const activeRides = await db.select({
    id: rides.id,
    status: rides.status,
    pickupLat: rides.pickupLat,
    pickupLng: rides.pickupLng,
    pickupAddress: rides.pickupAddress,
    requestedAt: rides.requestedAt,
  }).from(rides).where(or(
    eq(rides.status, 'searching'),
    eq(rides.status, 'accepted'),
    eq(rides.status, 'arriving'),
    eq(rides.status, 'started'),
  ));

  return {
    supply: {
      onlineDriversCount: onlineDrivers.length,
      drivers: onlineDrivers.map((d) => ({
        id: d.id,
        lat: parseFloat(d.currentLat || '0'),
        lng: parseFloat(d.currentLng || '0'),
      })),
    },
    demand: {
      activeRidesCount: activeRides.length,
      rides: activeRides.map((r) => ({
        id: r.id,
        status: r.status,
        lat: parseFloat(r.pickupLat || '0'),
        lng: parseFloat(r.pickupLng || '0'),
      })),
    },
  };
}

