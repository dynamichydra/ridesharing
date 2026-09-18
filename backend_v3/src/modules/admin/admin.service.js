import { eq, count, desc, and, gte, lt, sql, or, inArray } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  admins,
  drivers,
  users,
  rides,
  subscriptions,
  auditLogs,
  zones,
  vehicleTypes,
  sosAlerts,
  flaggedTrips,
  rideStatusHistory,
  vehicleInspections,
  payments,
} from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';

export async function getAdminMe(adminId) {
  const [admin] = await db.select({
    id: admins.id,
    email: admins.email,
    name: admins.name,
    role: admins.role,
    isActive: admins.isActive,
    lastLoginAt: admins.lastLoginAt,
    createdAt: admins.createdAt,
    updatedAt: admins.updatedAt,
  }).from(admins).where(eq(admins.id, adminId)).limit(1);

  if (!admin) throw { statusCode: 404, message: 'Admin not found' };

  return {
    ...admin,
    userType: 'admin',
    permissions: admin.role === 'super_admin' ? ['*'] : [
      'drivers.read', 'drivers.write',
      'riders.read', 'riders.write',
      'rides.read', 'rides.write',
      'payments.read',
      'payouts.read', 'payouts.write',
      'subscriptions.read', 'subscriptions.write',
      'pricing.read', 'pricing.write',
      'zones.read', 'zones.write',
      'moderation.read', 'moderation.write',
      'disputes.read', 'disputes.write',
      'notifications.read', 'notifications.write',
    ],
  };
}

function formatTimeAgo(dateOrTimestamp) {
  if (!dateOrTimestamp) return 'Just now';
  const diffMs = Date.now() - new Date(dateOrTimestamp).getTime();
  if (diffMs < 0 || isNaN(diffMs)) return 'Just now';

  const totalMin = Math.floor(diffMs / 60000);
  if (totalMin < 1) return 'Just now';
  if (totalMin < 60) return `${totalMin} ${totalMin === 1 ? 'min' : 'mins'} ago`;

  const totalHours = Math.floor(totalMin / 60);
  const remainingMins = totalMin % 60;

  if (totalHours < 24) {
    if (remainingMins === 0) {
      return `${totalHours} ${totalHours === 1 ? 'hr' : 'hrs'} ago`;
    }
    return `${totalHours} ${totalHours === 1 ? 'hr' : 'hrs'} ${remainingMins} min ago`;
  }

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  if (days < 7) {
    if (remainingHours === 0) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    return `${days} ${days === 1 ? 'day' : 'days'} ${remainingHours} hr ago`;
  }

  const weeks = Math.floor(days / 7);
  return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
}

export async function getDashboardStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // 1. Core Counts
  const [[driverTotal], [riderTotal], [rideTotal], [subTotal]] = await Promise.all([
    db.select({ total: count() }).from(drivers),
    db.select({ total: count() }).from(users),
    db.select({ total: count() }).from(rides),
    db.select({ total: count() }).from(subscriptions).where(eq(subscriptions.status, 'active')),
  ]);

  // 2. Driver status breakdown
  const [pendingDrivers] = await db.select({ total: count() }).from(drivers)
    .where(eq(drivers.approvalStatus, 'pending'));
  const [onlineDrivers] = await db.select({ total: count() }).from(drivers)
    .where(eq(drivers.isOnline, true));

  // Active trips where driver is currently on trip
  const [onTripDriversResult] = await db.select({ total: count() }).from(rides)
    .where(and(
      inArray(rides.status, ['accepted', 'arriving', 'started']),
      sql`${rides.driverId} IS NOT NULL`
    ));

  const totalDriversCount = Number(driverTotal?.total || 0);
  const onlineCount = Number(onlineDrivers?.total || 0);
  const onTripCount = Math.min(Number(onTripDriversResult?.total || 0), onlineCount);
  const idleCount = Math.max(0, onlineCount - onTripCount);
  const offlineCount = Math.max(0, totalDriversCount - onlineCount);

  // 3. Today's Rides
  const [todayRides] = await db.select({ total: count() }).from(rides)
    .where(gte(rides.requestedAt, todayStart));
  const [todayCompleted] = await db.select({ total: count() }).from(rides)
    .where(and(eq(rides.status, 'completed'), gte(rides.requestedAt, todayStart)));
  const [todayCancelled] = await db.select({ total: count() }).from(rides)
    .where(and(eq(rides.status, 'cancelled'), gte(rides.requestedAt, todayStart)));

  // 4. Period Growth (Last 7 Days vs Prior 7 Days)
  const [currentWeekRides] = await db.select({ total: count() }).from(rides)
    .where(gte(rides.requestedAt, sevenDaysAgo));
  const [priorWeekRides] = await db.select({ total: count() }).from(rides)
    .where(and(gte(rides.requestedAt, fourteenDaysAgo), lt(rides.requestedAt, sevenDaysAgo)));

  const cWeekRides = Number(currentWeekRides?.total || 0);
  const pWeekRides = Number(priorWeekRides?.total || 0);
  const ridesGrowth = pWeekRides > 0
    ? Math.round(((cWeekRides - pWeekRides) / pWeekRides) * 100)
    : (cWeekRides > 0 ? 100 : 0);

  // Driver Registrations Growth
  const [currentWeekDrivers] = await db.select({ total: count() }).from(drivers)
    .where(gte(drivers.createdAt, sevenDaysAgo));
  const [priorWeekDrivers] = await db.select({ total: count() }).from(drivers)
    .where(and(gte(drivers.createdAt, fourteenDaysAgo), lt(drivers.createdAt, sevenDaysAgo)));
  const cDrivers = Number(currentWeekDrivers?.total || 0);
  const pDrivers = Number(priorWeekDrivers?.total || 0);
  const driversGrowth = pDrivers > 0
    ? Math.round(((cDrivers - pDrivers) / pDrivers) * 100)
    : (cDrivers > 0 ? 100 : 0);

  // Revenue (Gross from captured payments by currency)
  const revenueResult = await db.execute(sql`
    SELECT
      COALESCE(SUM(amount_minor) FILTER (WHERE created_at >= ${sevenDaysAgo}), 0)::bigint AS current_week_rev,
      COALESCE(SUM(amount_minor) FILTER (WHERE created_at >= ${fourteenDaysAgo} AND created_at < ${sevenDaysAgo}), 0)::bigint AS prior_week_rev,
      COALESCE(SUM(amount_minor), 0)::bigint AS total_rev,
      UPPER(COALESCE(currency_code, 'USD')) AS currency_code
    FROM payments
    WHERE status = 'captured'
    GROUP BY UPPER(COALESCE(currency_code, 'USD'))
    ORDER BY total_rev DESC
  `);
  const revRows = revenueResult.rows ?? revenueResult ?? [];
  const earningsByCurrency = (revRows.length > 0 ? revRows : [{ current_week_rev: 0, prior_week_rev: 0, total_rev: 0, currency_code: 'USD' }]).map((r) => {
    const currentWeekRevMinor = Number(r.current_week_rev || 0);
    const priorWeekRevMinor = Number(r.prior_week_rev || 0);
    const totalRevMinor = Number(r.total_rev || 0);
    const currencyCode = (r.currency_code || 'USD').toUpperCase();
    const growthPct = priorWeekRevMinor > 0
      ? Math.round(((currentWeekRevMinor - priorWeekRevMinor) / priorWeekRevMinor) * 100)
      : (currentWeekRevMinor > 0 ? 100 : 0);

    return {
      currencyCode,
      valueMinor: currentWeekRevMinor,
      totalMinor: totalRevMinor,
      growthPct,
      growthLabel: 'from last week',
    };
  });

  const primaryEarnings = earningsByCurrency[0] || {
    valueMinor: 0,
    totalMinor: 0,
    currencyCode: 'USD',
    growthPct: 0,
    growthLabel: 'from last week',
  };

  // Average Driver Rating
  const [ratingResult] = await db.select({
    avgRating: sql`COALESCE(AVG(NULLIF(rating, 0)), 0)`,
  }).from(drivers).where(eq(drivers.approvalStatus, 'approved'));
  const rawAvg = Number(ratingResult?.avgRating || 0);
  const avgRating = rawAvg > 0 ? Number(rawAvg.toFixed(1)) : 0;

  // Fleet Health (Inspections & Documents)
  const [passedInspections] = await db.select({ total: count() }).from(vehicleInspections)
    .where(eq(vehicleInspections.status, 'passed'));
  const [totalInspections] = await db.select({ total: count() }).from(vehicleInspections);
  const totalInsp = Number(totalInspections?.total || 0);
  const passedInsp = Number(passedInspections?.total || 0);
  const inspectionOptimalPct = totalInsp > 0 ? Math.round((passedInsp / totalInsp) * 100) : (totalDriversCount > 0 ? 100 : 0);

  const [activeAlertsCount] = await db.select({ total: count() }).from(sosAlerts)
    .where(eq(sosAlerts.status, 'triggered'));

  const requestedToday = Number(todayRides?.total || 0);
  const completedToday = Number(todayCompleted?.total || 0);
  const completionRate = requestedToday > 0 ? Math.round((completedToday / requestedToday) * 100) : 0;

  return {
    kpis: {
      totalRides: {
        value: Number(rideTotal?.total || 0),
        growthPct: ridesGrowth,
        growthLabel: 'from last week',
      },
      activeDrivers: {
        value: onlineCount,
        growthPct: driversGrowth,
        growthLabel: 'from last week',
      },
      weeklyEarnings: primaryEarnings,
      weeklyEarningsByCurrency: earningsByCurrency,
      rating: {
        value: avgRating,
        scale: 5,
        trendLabel: avgRating > 0 ? 'Verified' : 'No ratings yet',
      },
    },
    fleetStatus: {
      online: onlineCount,
      onTrip: onTripCount,
      idle: idleCount,
      offline: offlineCount,
      total: totalDriversCount,
      pendingApproval: Number(pendingDrivers?.total || 0),
    },
    today: {
      requested: requestedToday,
      completed: completedToday,
      cancelled: Number(todayCancelled?.total || 0),
      completionRate,
    },
    fleetHealth: {
      batteryOptimalPct: onlineCount > 0 ? 100 : 0,
      tireNormalPct: onlineCount > 0 ? 100 : 0,
      inspectionOptimalPct,
      activeAlerts: Number(activeAlertsCount?.total || 0),
    },
    drivers: { total: totalDriversCount, pendingApproval: Number(pendingDrivers?.total || 0), online: onlineCount },
    riders: { total: Number(riderTotal?.total || 0) },
    rides: { total: Number(rideTotal?.total || 0), today: requestedToday, todayCompleted: completedToday },
    subscriptions: { active: Number(subTotal?.total || 0) },
  };
}

export async function getDispatchQueue(limit = 10) {
  try {
    const result = await db.execute(sql`
      SELECT
        r.id,
        r.pickup_address,
        r.drop_address,
        r.estimated_fare_minor,
        r.currency_code,
        r.status,
        r.requested_at,
        vt.name AS vehicle_type_name,
        vt.slug AS vehicle_category,
        u.name AS rider_name,
        u.phone AS rider_phone,
        EXTRACT(EPOCH FROM (NOW() - r.requested_at))::int / 60 AS waiting_minutes
      FROM rides r
      LEFT JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
      LEFT JOIN users u ON u.id = r.rider_id
      WHERE r.status IN ('searching', 'requested', 'accepted', 'arriving')
      ORDER BY r.requested_at ASC
      LIMIT ${limit}
    `);

    const rows = result.rows ?? result;
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        pickupAddress: r.pickup_address || 'Pickup Point',
        dropAddress: r.drop_address || 'Dropoff Point',
        vehicleTypeName: r.vehicle_type_name || 'Standard',
        vehicleCategory: r.vehicle_category || 'Sedan',
        passengerCount: 1,
        estimatedFareMinor: r.estimated_fare_minor || 0,
        currencyCode: r.currency_code || 'USD',
        status: r.status,
        waitingMinutes: Math.max(0, Number(r.waiting_minutes || 0)),
        etaMinutes: Math.max(1, Number(r.waiting_minutes || 1)),
        riderName: r.rider_name || 'Rider',
      }));
    }
  } catch (err) {
    console.error('getDispatchQueue query error:', err);
  }

  return [];
}

export async function getLiveMonitoringAlerts() {
  const [sosList, flaggedList, recentLogs] = await Promise.all([
    db.select({
      id: sosAlerts.id,
      rideId: sosAlerts.rideId,
      userType: sosAlerts.userType,
      status: sosAlerts.status,
      createdAt: sosAlerts.createdAt,
    }).from(sosAlerts)
      .where(eq(sosAlerts.status, 'triggered'))
      .orderBy(desc(sosAlerts.createdAt))
      .limit(5),

    db.select({
      id: flaggedTrips.id,
      rideId: flaggedTrips.rideId,
      reason: flaggedTrips.reason,
      deviationPct: flaggedTrips.deviationPct,
      status: flaggedTrips.status,
      createdAt: flaggedTrips.createdAt,
    }).from(flaggedTrips)
      .where(eq(flaggedTrips.status, 'pending_review'))
      .orderBy(desc(flaggedTrips.createdAt))
      .limit(5),

    db.select({
      id: rideStatusHistory.id,
      rideId: rideStatusHistory.rideId,
      fromStatus: rideStatusHistory.fromStatus,
      toStatus: rideStatusHistory.toStatus,
      changedBy: rideStatusHistory.changedBy,
      reason: rideStatusHistory.reason,
      createdAt: rideStatusHistory.createdAt,
    }).from(rideStatusHistory)
      .orderBy(desc(rideStatusHistory.createdAt))
      .limit(10),
  ]);

  const alerts = [];

  for (const s of sosList) {
    alerts.push({
      id: `sos-${s.id}`,
      type: 'emergency',
      title: 'SOS Emergency Alert',
      message: `Triggered by ${s.userType} on Ride #${String(s.rideId).slice(0, 8)}`,
      severity: 'critical',
      createdAt: s.createdAt,
    });
  }

  for (const f of flaggedList) {
    alerts.push({
      id: `flag-${f.id}`,
      type: 'deviation',
      title: 'Driver Off Route / Fare Deviation',
      message: `Ride #${String(f.rideId).slice(0, 8)} deviated by ${f.deviationPct}%.`,
      severity: 'warning',
      createdAt: f.createdAt,
    });
  }

  const eventLogs = recentLogs.map((l) => {
    let isoTimestamp = new Date().toISOString();
    let timeStr = '';
    if (l.createdAt) {
      const d = new Date(l.createdAt);
      if (!isNaN(d.getTime())) {
        isoTimestamp = d.toISOString();
        const hours = d.getUTCHours();
        const minutes = d.getUTCMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedMinutes = minutes < 10 ? `0${minutes}` : String(minutes);
        timeStr = `${String(formattedHours).padStart(2, '0')}:${formattedMinutes} ${ampm}`;
      }
    }
    let label = `Ride #${String(l.rideId).slice(0, 6)} changed to ${l.toStatus}`;
    let level = 'info';

    if (l.toStatus === 'started') {
      label = `Ride #${String(l.rideId).slice(0, 6)} started`;
      level = 'primary';
    } else if (l.toStatus === 'completed') {
      label = `Ride #${String(l.rideId).slice(0, 6)} completed`;
      level = 'success';
    } else if (l.toStatus === 'cancelled') {
      label = `Ride #${String(l.rideId).slice(0, 6)} cancelled`;
      level = 'error';
    } else if (l.toStatus === 'accepted') {
      label = `Ride #${String(l.rideId).slice(0, 6)} assigned to driver`;
      level = 'primary';
    }

    return {
      id: l.id,
      time: timeStr,
      timestamp: l.createdAt,
      text: label,
      level,
    };
  });

  return {
    alerts,
    eventLogs,
  };
}

export async function getSupplyDemandAnalytics() {
  const activeZones = await db.select({
    id: zones.id,
    name: zones.name,
    type: zones.type,
    multiplier: zones.multiplier,
  }).from(zones).where(eq(zones.isActive, true)).limit(6);

  const onlineDriversCount = (await db.select({ total: count() }).from(drivers).where(eq(drivers.isOnline, true)))[0]?.total || 0;
  const activeRidesCount = (await db.select({ total: count() }).from(rides).where(inArray(rides.status, ['searching', 'accepted', 'arriving', 'started'])))[0]?.total || 0;

  const totalOnline = Number(onlineDriversCount);
  const totalActiveRides = Number(activeRidesCount);

  let marketEquilibriumScore = 100;
  if (totalOnline > 0 || totalActiveRides > 0) {
    const totalVolume = totalOnline + totalActiveRides;
    const diff = Math.abs(totalOnline - totalActiveRides);
    marketEquilibriumScore = Math.max(10, Math.round(100 - (diff / totalVolume) * 100));
  }

  const zonesAnalytics = activeZones.map((z) => {
    const isSurplus = totalOnline >= totalActiveRides;
    const supplyPct = totalOnline + totalActiveRides > 0 ? Math.round((totalOnline / (totalOnline + totalActiveRides)) * 100) : 50;
    const demandPct = 100 - supplyPct;

    return {
      zoneId: z.id,
      zoneName: z.name,
      supplyPct,
      demandPct,
      gapLabel: isSurplus ? 'Surplus' : 'Deficit',
      isSurplus,
      multiplier: Number(z.multiplier || 1.0),
    };
  });

  return {
    marketEquilibriumScore,
    statusLabel: marketEquilibriumScore >= 75 ? 'Balanced' : 'Attention Required',
    summaryMessage: activeZones.length > 0
      ? `System is operating across ${activeZones.length} active service zones with ${totalOnline} online drivers.`
      : 'No active zones defined in the system yet.',
    onlineDriversCount: totalOnline,
    activeRidesCount: totalActiveRides,
    zones: zonesAnalytics,
  };
}

export async function getEarningsTrend(timeframe = 'week', filterCurrency = null) {
  let days = 7;
  if (timeframe === 'month') days = 30;
  if (timeframe === 'last_week') days = 14;

  const from = new Date(Date.now() - days * 86400000);
  const currencyFilter = filterCurrency && filterCurrency !== 'all' ? filterCurrency.toUpperCase() : null;

  const result = await db.execute(sql`
    SELECT
      DATE(r.requested_at) AS date,
      TO_CHAR(r.requested_at, 'Dy') AS day_name,
      UPPER(COALESCE(p.currency_code, r.currency_code, 'USD')) AS currency_code,
      COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'completed')::int AS completed_count,
      COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'cancelled')::int AS cancelled_count,
      COUNT(DISTINCT r.id)::int AS total_rides,
      COALESCE(SUM(p.amount_minor) FILTER (WHERE p.status = 'captured'), 0)::bigint AS revenue_minor
    FROM rides r
    LEFT JOIN payments p ON p.ride_id = r.id
    WHERE r.requested_at >= ${from}
      ${currencyFilter ? sql`AND (UPPER(p.currency_code) = ${currencyFilter} OR (p.currency_code IS NULL AND UPPER(r.currency_code) = ${currencyFilter}))` : sql``}
    GROUP BY DATE(r.requested_at), TO_CHAR(r.requested_at, 'Dy'), UPPER(COALESCE(p.currency_code, r.currency_code, 'USD'))
    ORDER BY date ASC
  `);

  const rows = result.rows ?? result;
  if (rows && rows.length > 0) {
    return rows.map((r) => {
      const cur = (r.currency_code || 'USD').toUpperCase();
      return {
        date: r.date,
        dayName: r.day_name,
        completedCount: Number(r.completed_count || 0),
        cancelledCount: Number(r.cancelled_count || 0),
        totalRides: Number(r.total_rides || 0),
        revenueMinor: Number(r.revenue_minor || 0),
        currencyCode: cur,
      };
    });
  }

  return [];
}

export async function getRecentActivity(limit = 10) {
  try {
    const result = await db.execute(sql`
      SELECT
        r.id,
        r.status,
        r.requested_at,
        r.completed_at,
        r.pickup_address,
        r.drop_address,
        r.estimated_fare_minor,
        r.final_fare_minor,
        r.currency_code,
        u.name AS rider_name,
        u.phone AS rider_phone,
        d.name AS driver_name,
        vt.name AS vehicle_type_name,
        vt.slug AS vehicle_category
      FROM rides r
      LEFT JOIN users u ON u.id = r.rider_id
      LEFT JOIN drivers d ON d.id = r.driver_id
      LEFT JOIN vehicle_types vt ON vt.id = r.vehicle_type_id
      ORDER BY r.requested_at DESC
      LIMIT ${limit}
    `);

    const rows = result.rows ?? result;
    if (rows && rows.length > 0) {
      return rows.map((r) => {
        const timeAgo = r.status === 'started' || r.status === 'arriving' ? 'Active' : formatTimeAgo(r.requested_at);
        const fare = r.final_fare_minor || r.estimated_fare_minor || 0;

        return {
          id: r.id,
          riderName: r.rider_name || 'Rider',
          driverName: r.driver_name || 'Unassigned',
          vehicleTypeName: r.vehicle_type_name || 'Standard',
          pickupAddress: r.pickup_address || 'Pickup Point',
          dropAddress: r.drop_address || 'Dropoff Point',
          fareMinor: fare,
          currencyCode: r.currency_code || 'USD',
          status: r.status,
          timeAgo,
          requestedAt: r.requested_at,
        };
      });
    }
  } catch (err) {
    console.error('getRecentActivity query error:', err);
  }

  return [];
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

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM subscription_plans sp
    ${whereClause}
  `);
  const countRows = countResult.rows ?? countResult;
  const total = Number(countRows[0]?.total || 0);

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
    vehicleModel: drivers.vehicleModel,
    rating: drivers.rating,
  }).from(drivers).where(and(eq(drivers.isOnline, true), sql`${drivers.currentLat} IS NOT NULL`));

  const activeRides = await db.select({
    id: rides.id,
    status: rides.status,
    pickupLat: rides.pickupLat,
    pickupLng: rides.pickupLng,
    pickupAddress: rides.pickupAddress,
    dropLat: rides.dropLat,
    dropLng: rides.dropLng,
    dropAddress: rides.dropAddress,
    requestedAt: rides.requestedAt,
  }).from(rides).where(and(
    or(
      eq(rides.status, 'searching'),
      eq(rides.status, 'accepted'),
      eq(rides.status, 'arriving'),
      eq(rides.status, 'started'),
    ),
    sql`${rides.pickupLat} IS NOT NULL`
  ));

  const activeRideDriverRows = await db.select({ driverId: rides.driverId }).from(rides)
    .where(and(
      inArray(rides.status, ['accepted', 'arriving', 'started']),
      sql`${rides.driverId} IS NOT NULL`
    ));
  const activeRideDriverIds = new Set(activeRideDriverRows.map((r) => r.driverId));

  return {
    supply: {
      onlineDriversCount: onlineDrivers.length,
      drivers: onlineDrivers.map((d) => ({
        id: d.id,
        name: d.name || 'Driver',
        lat: parseFloat(d.currentLat || '0'),
        lng: parseFloat(d.currentLng || '0'),
        isOnTrip: activeRideDriverIds.has(d.id),
        rating: d.rating,
        vehicleModel: d.vehicleModel,
      })),
    },
    demand: {
      activeRidesCount: activeRides.length,
      rides: activeRides.map((r) => ({
        id: r.id,
        status: r.status,
        pickupLat: parseFloat(r.pickupLat || '0'),
        pickupLng: parseFloat(r.pickupLng || '0'),
        dropLat: parseFloat(r.dropLat || '0'),
        dropLng: parseFloat(r.dropLng || '0'),
        pickupAddress: r.pickupAddress,
        dropAddress: r.dropAddress,
      })),
    },
  };
}
