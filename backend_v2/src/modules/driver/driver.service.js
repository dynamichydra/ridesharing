import { eq, desc, count, and, or, ilike, ne, sql, gte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { drivers, subscriptions, subscriptionPlans, cities, states, driverPayoutAccounts, vehicleModels, vehicleTypes, rides, countries, wallets, walletTransactions, driverDocuments } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { paginate } from '../../utils/response.js';
import { advanceRegistration, REGISTRATION_STEP } from '../../utils/registration.js';
import { createUploadUrl, verifyObjectExists } from '../../utils/storage.js';
import * as vehicleService from '../vehicle/vehicle.service.js';
import * as documentsService from '../documents/documents.service.js';
import * as onboardingService from '../onboarding/onboarding.service.js';
import { isLocationInServiceArea } from '../zone/zone.service.js';
import { validateDriverPhoneCountryMatch } from '../auth/auth.service.js';

function getStartOfTodayInTimezone(timeZone = 'UTC') {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const y = parts.find((p) => p.type === 'year').value;
    const m = parts.find((p) => p.type === 'month').value;
    const d = parts.find((p) => p.type === 'day').value;

    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone }));
    const offsetMs = tzDate.getTime() - utcDate.getTime();

    return new Date(new Date(`${y}-${m}-${d}T00:00:00Z`).getTime() - offsetMs);
  } catch {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  }
}

export async function getDashboardSummary(driverId) {
  const [driver] = await db.select({
    id: drivers.id,
    name: drivers.name,
    phone: drivers.phone,
    profilePhoto: drivers.profilePhoto,
    rating: drivers.rating,
    isOnline: drivers.isOnline,
    vehicleModel: drivers.vehicleModel,
    vehicleNumber: drivers.vehicleNumber,
    countryId: drivers.countryId,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  // Resolve driver's country timezone
  let timezone = 'UTC';
  if (driver.countryId) {
    const [country] = await db.select({ timezone: countries.timezone }).from(countries).where(eq(countries.id, driver.countryId)).limit(1);
    if (country?.timezone) timezone = country.timezone;
  } else {
    const [defaultCountry] = await db.select({ timezone: countries.timezone }).from(countries).where(eq(countries.isDefault, true)).limit(1);
    if (defaultCountry?.timezone) timezone = defaultCountry.timezone;
  }

  // Calculate start of today (midnight in driver's country timezone)
  const startOfToday = getStartOfTodayInTimezone(timezone);

  // Completed rides today
  const todayCompletedRides = await db.select({
    id: rides.id,
    finalFareMinor: rides.finalFareMinor,
    estimatedFareMinor: rides.estimatedFareMinor,
    actualDurationMin: rides.actualDurationMin,
    durationMin: rides.durationMin,
    completedAt: rides.completedAt,
    startedAt: rides.startedAt,
  }).from(rides).where(
    and(
      eq(rides.driverId, driverId),
      eq(rides.status, 'completed'),
      gte(rides.completedAt, startOfToday),
    ),
  );

  const totalRidesToday = todayCompletedRides.length;
  let totalEarningsMinor = 0;
  let totalMinutes = 0;

  for (const r of todayCompletedRides) {
    totalEarningsMinor += (r.finalFareMinor || r.estimatedFareMinor || 0);
    if (r.actualDurationMin) {
      totalMinutes += r.actualDurationMin;
    } else if (r.startedAt && r.completedAt) {
      const mins = Math.ceil((new Date(r.completedAt) - new Date(r.startedAt)) / 60000);
      totalMinutes += (mins > 0 ? mins : 0);
    } else if (r.durationMin) {
      totalMinutes += r.durationMin;
    }
  }

  const totalEarnings = totalEarningsMinor / 100;
  const hoursNum = parseFloat((totalMinutes / 60).toFixed(1));
  const formattedHours = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : `${totalMinutes}m`;

  return {
    id: driver.id,
    name: driver.name || 'Driver',
    phone: driver.phone,
    profilePhoto: driver.profilePhoto || null,
    rating: driver.rating ? parseFloat(driver.rating).toFixed(1) : '5.0',
    isOnline: !!driver.isOnline,
    vehicleModel: driver.vehicleModel || null,
    vehicleNumber: driver.vehicleNumber || null,
    today: {
      totalRides: totalRidesToday,
      totalEarnings: totalEarnings,
      totalWorkingMinutes: totalMinutes,
      totalWorkingHours: hoursNum,
      formattedWorkingHours: formattedHours,
    },
  };
}

export async function getDriverEarnings(driverId, { period = 'daily', weekOffset = 0, monthOffset = 0 } = {}) {
  const [driver] = await db.select({
    id: drivers.id,
    countryId: drivers.countryId,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  let timezone = 'UTC';
  let currencyCode = 'USD';
  if (driver.countryId) {
    const [country] = await db.select({
      timezone: countries.timezone,
      currencyCode: countries.currencyCode,
    }).from(countries).where(eq(countries.id, driver.countryId)).limit(1);
    if (country?.timezone) timezone = country.timezone;
    if (country?.currencyCode) currencyCode = country.currencyCode.toUpperCase();
  }

  const now = new Date();
  let currentStart, currentEnd, prevStart, prevEnd, growthPeriodText, listTitle;

  if (period === 'weekly') {
    const dayOfWeek = (now.getUTCDay() + 6) % 7; // 0=Mon, 6=Sun
    const startOfWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek + (weekOffset * 7), 0, 0, 0, 0));
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000 - 1);

    currentStart = startOfWeek;
    currentEnd = endOfWeek;
    prevStart = new Date(startOfWeek.getTime() - 7 * 86400000);
    prevEnd = new Date(startOfWeek.getTime() - 1);
    growthPeriodText = 'vs Last Week';
    listTitle = weekOffset === 0 ? 'This Week' : 'Selected Week';
  } else if (period === 'monthly') {
    const targetMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1, 0, 0, 0, 0));
    currentStart = targetMonthDate;
    currentEnd = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    prevStart = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth() - 1, 1, 0, 0, 0, 0));
    prevEnd = new Date(Date.UTC(targetMonthDate.getUTCFullYear(), targetMonthDate.getUTCMonth(), 0, 23, 59, 59, 999));
    growthPeriodText = 'vs Last Month';
    listTitle = monthOffset === 0 ? 'This Month' : 'Selected Month';
  } else {
    currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    prevStart = new Date(currentStart.getTime() - 86400000);
    prevEnd = new Date(currentStart.getTime() - 1);
    growthPeriodText = 'vs Yesterday';
    listTitle = 'Last 7 Days';
  }

  const currentRides = await db.select({
    id: rides.id,
    finalFareMinor: rides.finalFareMinor,
    estimatedFareMinor: rides.estimatedFareMinor,
    paymentMethod: rides.paymentMethod,
    completedAt: rides.completedAt,
    startedAt: rides.startedAt,
    actualDurationMin: rides.actualDurationMin,
    durationMin: rides.durationMin,
  }).from(rides).where(
    and(
      eq(rides.driverId, driverId),
      eq(rides.status, 'completed'),
      gte(rides.completedAt, currentStart),
      sql`${rides.completedAt} <= ${currentEnd}`
    )
  );

  const prevRides = await db.select({
    finalFareMinor: rides.finalFareMinor,
    estimatedFareMinor: rides.estimatedFareMinor,
  }).from(rides).where(
    and(
      eq(rides.driverId, driverId),
      eq(rides.status, 'completed'),
      gte(rides.completedAt, prevStart),
      sql`${rides.completedAt} <= ${prevEnd}`
    )
  );

  let incentivesMinor = 0;
  const [driverWallet] = await db.select({ id: wallets.id }).from(wallets).where(eq(wallets.driverId, driverId)).limit(1);
  if (driverWallet) {
    const incentiveTxs = await db.select({
      amountMinor: walletTransactions.amountMinor,
    }).from(walletTransactions).where(
      and(
        eq(walletTransactions.walletId, driverWallet.id),
        eq(walletTransactions.type, 'credit'),
        or(
          eq(walletTransactions.reason, 'referral_bonus'),
          eq(walletTransactions.reason, 'incentive'),
          eq(walletTransactions.reason, 'bonus'),
          eq(walletTransactions.reason, 'driver_incentive')
        ),
        gte(walletTransactions.createdAt, currentStart),
        sql`${walletTransactions.createdAt} <= ${currentEnd}`
      )
    );
    for (const tx of incentiveTxs) {
      incentivesMinor += (tx.amountMinor || 0);
    }
  }

  let fareAmountMinor = 0;
  let cashCollectedMinor = 0;
  let walletPaymentsMinor = 0;
  let totalMinutes = 0;

  for (const r of currentRides) {
    const fare = r.finalFareMinor || r.estimatedFareMinor || 0;
    fareAmountMinor += fare;
    if (r.paymentMethod === 'cash') {
      cashCollectedMinor += fare;
    } else {
      walletPaymentsMinor += fare;
    }

    if (r.actualDurationMin) {
      totalMinutes += r.actualDurationMin;
    } else if (r.startedAt && r.completedAt) {
      const mins = Math.ceil((new Date(r.completedAt) - new Date(r.startedAt)) / 60000);
      totalMinutes += (mins > 0 ? mins : 0);
    } else if (r.durationMin) {
      totalMinutes += r.durationMin;
    }
  }

  const tripsCount = currentRides.length;
  const deductionsMinor = Math.round(fareAmountMinor * 0.15);
  const otherEarningsMinor = 0;
  const grossEarningsMinor = fareAmountMinor + incentivesMinor + otherEarningsMinor;
  const netEarningsMinor = grossEarningsMinor - deductionsMinor;

  let prevFareMinor = 0;
  for (const r of prevRides) {
    prevFareMinor += (r.finalFareMinor || r.estimatedFareMinor || 0);
  }
  const prevNetMinor = Math.round(prevFareMinor * 0.85);
  let growthPercentNum = 0;
  if (prevNetMinor > 0) {
    growthPercentNum = ((netEarningsMinor - prevNetMinor) / prevNetMinor) * 100;
  } else if (netEarningsMinor > 0) {
    growthPercentNum = 100;
  }

  const formattedHours = totalMinutes >= 60
    ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
    : `${totalMinutes}m`;

  const totalFare = fareAmountMinor / 100;
  const cashPercent = totalFare > 0 ? (cashCollectedMinor / fareAmountMinor) * 100 : 50.0;
  const walletPercent = totalFare > 0 ? (walletPaymentsMinor / fareAmountMinor) * 100 : 50.0;
  const avgPerTripMinor = tripsCount > 0 ? Math.round(netEarningsMinor / tripsCount) : 0;

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthsOfYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatAmount = (minor) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format((minor || 0) / 100);
    } catch {
      return `${currencyCode} ${((minor || 0) / 100).toFixed(2)}`;
    }
  };

  let historyItems = [];

  if (period === 'weekly') {
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentStart.getTime() + i * 86400000);
      const dayStart = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), 23, 59, 59, 999));

      const dayRides = currentRides.filter(r => {
        const cDate = new Date(r.completedAt);
        return cDate >= dayStart && cDate <= dayEnd;
      });

      let dayFareMinor = 0;
      for (const r of dayRides) dayFareMinor += (r.finalFareMinor || r.estimatedFareMinor || 0);
      const dayNetMinor = Math.round(dayFareMinor * 0.85);

      const title = `${daysOfWeek[dayDate.getUTCDay()]}, ${dayDate.getUTCDate()} ${monthsOfYear[dayDate.getUTCMonth()]}`;
      historyItems.push({
        title,
        trips: dayRides.length,
        amountMinor: dayNetMinor,
        amount: formatAmount(dayNetMinor),
      });
    }
  } else if (period === 'monthly') {
    const totalDaysInMonth = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() + 1, 0)).getUTCDate();
    for (let d = 1; d <= Math.min(totalDaysInMonth, 7); d++) {
      const dayDate = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth(), d, 0, 0, 0, 0));
      const dayStart = dayDate;
      const dayEnd = new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth(), d, 23, 59, 59, 999));

      const dayRides = currentRides.filter(r => {
        const cDate = new Date(r.completedAt);
        return cDate >= dayStart && cDate <= dayEnd;
      });

      let dayFareMinor = 0;
      for (const r of dayRides) dayFareMinor += (r.finalFareMinor || r.estimatedFareMinor || 0);
      const dayNetMinor = Math.round(dayFareMinor * 0.85);

      const title = `${daysOfWeek[dayDate.getUTCDay()]}, ${dayDate.getUTCDate()} ${monthsOfYear[dayDate.getUTCMonth()]}`;
      historyItems.push({
        title,
        trips: dayRides.length,
        amountMinor: dayNetMinor,
        amount: formatAmount(dayNetMinor),
      });
    }
  } else {
    const sevenDaysAgo = new Date(currentStart.getTime() - 6 * 86400000);
    const last7DaysRides = await db.select({
      finalFareMinor: rides.finalFareMinor,
      estimatedFareMinor: rides.estimatedFareMinor,
      completedAt: rides.completedAt,
    }).from(rides).where(
      and(
        eq(rides.driverId, driverId),
        eq(rides.status, 'completed'),
        gte(rides.completedAt, sevenDaysAgo)
      )
    );

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentStart.getTime() - i * 86400000);
      const dayStart = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(Date.UTC(dayDate.getUTCFullYear(), dayDate.getUTCMonth(), dayDate.getUTCDate(), 23, 59, 59, 999));

      const dayRides = last7DaysRides.filter(r => {
        const cDate = new Date(r.completedAt);
        return cDate >= dayStart && cDate <= dayEnd;
      });

      let dayFareMinor = 0;
      for (const r of dayRides) dayFareMinor += (r.finalFareMinor || r.estimatedFareMinor || 0);
      const dayNetMinor = Math.round(dayFareMinor * 0.85);

      let title = '';
      let dateSubtitle = null;
      let isToday = false;

      if (i === 0) {
        title = 'Today';
        dateSubtitle = `${dayDate.getUTCDate()} ${monthsOfYear[dayDate.getUTCMonth()]}`;
        isToday = true;
      } else if (i === 1) {
        title = 'Yesterday';
        dateSubtitle = `${dayDate.getUTCDate()} ${monthsOfYear[dayDate.getUTCMonth()]}`;
      } else {
        title = `${daysOfWeek[dayDate.getUTCDay()]}, ${dayDate.getUTCDate()} ${monthsOfYear[dayDate.getUTCMonth()]}`;
      }

      historyItems.push({
        title,
        dateSubtitle,
        isToday,
        trips: dayRides.length,
        amountMinor: dayNetMinor,
        amount: formatAmount(dayNetMinor),
      });
    }
  }

  return {
    period,
    currencyCode,
    totalEarnings: formatAmount(netEarningsMinor),
    totalEarningsMinor: netEarningsMinor,
    growthPercent: `${growthPercentNum >= 0 ? '+' : ''}${growthPercentNum.toFixed(1)}%`,
    growthPeriod: growthPeriodText,
    cashCollected: formatAmount(cashCollectedMinor),
    cashCollectedMinor,
    incentivesAmount: formatAmount(incentivesMinor),
    incentivesMinor,
    trips: tripsCount,
    onlineHours: formattedHours,
    avgPerTrip: formatAmount(avgPerTripMinor),
    cashPercent: parseFloat(cashPercent.toFixed(1)),
    walletPercent: parseFloat(walletPercent.toFixed(1)),
    fareAmount: formatAmount(fareAmountMinor),
    incentives: formatAmount(incentivesMinor),
    otherEarnings: formatAmount(otherEarningsMinor),
    grossEarnings: formatAmount(grossEarningsMinor),
    deductions: deductionsMinor > 0 ? `-${formatAmount(deductionsMinor)}` : formatAmount(0),
    netEarnings: formatAmount(netEarningsMinor),
    listTitle,
    historyItems,
  };
}

export async function getDriverMe(driverId) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  let country = null;
  let state = null;
  let city = null;

  if (driver.countryId) {
    const [c] = await db.select().from(countries).where(eq(countries.id, driver.countryId)).limit(1);
    country = c || null;
  }
  if (driver.stateId) {
    const [s] = await db.select().from(states).where(eq(states.id, driver.stateId)).limit(1);
    state = s || null;
  }
  if (driver.cityId) {
    const [ct] = await db.select().from(cities).where(eq(cities.id, driver.cityId)).limit(1);
    city = ct || null;
  }

  let vehicleType = null;
  if (driver.vehicleTypeId) {
    const [vt] = await db.select().from(vehicleTypes).where(eq(vehicleTypes.id, driver.vehicleTypeId)).limit(1);
    vehicleType = vt || null;
  }

  // Active Subscription
  const [activeSub] = await db.select({
    id: subscriptions.id,
    planId: subscriptions.planId,
    status: subscriptions.status,
    startDate: subscriptions.startDate,
    endDate: subscriptions.endDate,
    amountMinor: subscriptions.amountMinor,
    currencyCode: subscriptions.currencyCode,
    planName: subscriptionPlans.name,
    planType: subscriptionPlans.type,
    maxRidesPerDay: subscriptionPlans.maxRidesPerDay,
    priorityMatching: subscriptionPlans.priorityMatching,
  }).from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        eq(subscriptions.driverId, driverId),
        eq(subscriptions.status, 'active'),
      )
    ).limit(1);

  // Payout Account
  const [payoutAccount] = await db.select().from(driverPayoutAccounts)
    .where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);

  // Wallet
  const [wallet] = await db.select().from(wallets).where(eq(wallets.driverId, driverId)).limit(1);

  // Today Summary
  const todaySummary = await getDashboardSummary(driverId).catch(() => null);

  const { aadharNumber, aadharDoc, licenseDoc, ...safeDriver } = driver;

  return {
    ...safeDriver,
    userType: 'driver',
    role: 'driver',
    country,
    state,
    city,
    vehicleType,
    activeSubscription: activeSub || null,
    payoutAccount: payoutAccount || null,
    wallet: wallet ? {
      id: wallet.id,
      balanceMinor: wallet.balanceMinor,
      currencyCode: wallet.currencyCode,
      status: wallet.status,
    } : null,
    todaySummary: todaySummary?.today || null,
  };
}

export async function getProfile(driverId) {
  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };
  const { aadharNumber, ...safe } = driver;
  return safe;
}

export async function updateProfile(driverId, data) {
  const allowed = [
    'name', 'email', 'vehicleNumber', 'vehicleModel', 'vehicleYear', 'fcmToken',
    'dateOfBirth', 'gender', 'referralCode', 'preferredLanguageCode', 'profilePhoto',
  ];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));
  updates.updatedAt = new Date();
  const [updated] = await db.update(drivers).set(updates).where(eq(drivers.id, driverId)).returning();

  const touchedPersonalInfo = ['name', 'dateOfBirth', 'gender', 'referralCode'].some((f) => f in data);
  if (touchedPersonalInfo) await advanceRegistration(driverId, REGISTRATION_STEP.PERSONAL_INFO);

  return updated;
}

export async function updateDrivingLocation(driverId, { countryId, stateId, cityId }) {
  const [city] = await db.select().from(cities).where(eq(cities.id, cityId)).limit(1);
  if (!city || !city.isActive) throw { statusCode: 400, code: 'CITY_INACTIVE', message: 'Selected city is not available' };
  if (city.stateId !== stateId || city.countryId !== countryId) {
    throw { statusCode: 400, message: 'City does not belong to the given state/country' };
  }

  // Cross-border phone matching: driver's phone must match operating country
  const [driver] = await db.select({ phone: drivers.phone }).from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (driver?.phone) {
    await validateDriverPhoneCountryMatch(driver.phone, countryId);
  }

  const [updated] = await db.update(drivers).set({
    countryId, stateId, cityId, updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await advanceRegistration(driverId, REGISTRATION_STEP.LOCATION);
  return updated;
}

export async function requestProfilePhotoUploadUrl(contentType) {
  return createUploadUrl('driver-profile-photos', contentType, 5);
}

export async function confirmProfilePhoto(driverId, key) {
  await verifyObjectExists(key, 5);
  const [updated] = await db.update(drivers).set({ profilePhoto: key, updatedAt: new Date() })
    .where(eq(drivers.id, driverId)).returning();
  await advanceRegistration(driverId, REGISTRATION_STEP.PHOTO);
  return updated;
}

// Legacy single-shot document submission — superseded by the documents module,
// kept for backward compatibility with any client still calling it.
export async function submitDocuments(driverId, docs) {
  const [updated] = await db.update(drivers).set({
    licenseNumber:  docs.licenseNumber,
    licenseDoc:     docs.licenseDoc,
    aadharNumber:   docs.aadharNumber,
    aadharDoc:      docs.aadharDoc,
    vehicleTypeId:  docs.vehicleTypeId,
    vehicleNumber:  docs.vehicleNumber,
    vehicleModel:   docs.vehicleModel,
    vehiclePhoto:   docs.vehiclePhoto,
    approvalStatus: 'pending',
    updatedAt:      new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: driverId, actorType: 'driver',
    action: 'DOCUMENTS_SUBMITTED', entityType: 'driver', entityId: driverId,
  });
  return updated;
}

// ── Registration summary / submit ────────────────────────────────────────────

export async function getRegistrationSummary(driverId) {
  const driver = await getProfile(driverId);
  const [vehicles, myDocuments, answers, missingAnswers] = await Promise.all([
    vehicleService.listMyVehicles(driverId),
    documentsService.listMyDocuments(driverId),
    onboardingService.getMyAnswers(driverId),
    onboardingService.getMissingRequiredAnswers(driverId, driver.countryId),
  ]);

  const requiredDocTypes = await documentsService.getRequiredDocumentTypesFor(driver.countryId, driver.cityId, driver.vehicleTypeId);
  const uploadedDocTypeIds = new Set(myDocuments.map((d) => d.documentTypeId));
  const missingDocuments = requiredDocTypes.filter((t) => t.isRequired && !uploadedDocTypeIds.has(t.id)).map((t) => t.code);

  const pendingLegalAcceptance = await onboardingService.hasPendingLegalAcceptance(driverId, driver.countryId);

  const missing = [
    ...(driver.name ? [] : ['name']),
    ...(driver.countryId && driver.stateId && driver.cityId ? [] : ['drivingLocation']),
    ...(vehicles.some((v) => v.isActive) ? [] : ['vehicle']),
    ...(pendingLegalAcceptance ? ['legalAcceptance'] : []),
    ...missingAnswers.map((code) => `question:${code}`),
    ...missingDocuments.map((code) => `document:${code}`),
  ];

  return {
    driver, vehicles, documents: myDocuments, answers,
    isComplete: missing.length === 0,
    missing,
  };
}

export async function submitApplication(driverId) {
  const summary = await getRegistrationSummary(driverId);
  if (!summary.isComplete) {
    throw { statusCode: 422, code: 'INCOMPLETE_REQUIRED_FIELDS', message: 'Registration is incomplete', missing: summary.missing };
  }

  const [updated] = await db.update(drivers).set({
    registrationStatus: 'pending_review', registrationStep: REGISTRATION_STEP.SUBMITTED, updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.DRIVER_REGISTRATION_SUBMITTED, { driverId });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: driverId, actorType: 'driver',
    action: 'REGISTRATION_SUBMITTED', entityType: 'driver', entityId: driverId,
  });
  return updated;
}

export async function goOnline(driverId, lat, lng) {
  const [driver] = await db.select({
    approvalStatus: drivers.approvalStatus,
    isBlocked:      drivers.isBlocked,
  }).from(drivers).where(eq(drivers.id, driverId)).limit(1);

  if (!driver)                              throw { statusCode: 404, message: 'Driver not found' };
  if (driver.isBlocked)                     throw { statusCode: 403, message: 'Account is blocked' };
  if (driver.approvalStatus !== 'approved') throw { statusCode: 403, message: 'Account not approved yet' };

  // Service area boundary check: driver cannot go online outside operational service area
  const locationCheck = await isLocationInServiceArea(lat, lng);
  if (!locationCheck.inServiceArea) {
    throw {
      statusCode: 400,
      code: locationCheck.reason,
      message: 'You cannot go online outside the operational service area',
    };
  }

  // A subscription is no longer required to go online (see commission.service.js) — but a
  // driver still needs somewhere for the platform to actually pay them, so an approved payout
  // account (Stripe Connect or RazorpayX, see payout-account/bank-account modules) is now the
  // gate instead of subscriptionStatus.
  const [payoutAccount] = await db.select({ status: driverPayoutAccounts.status })
    .from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);
  if (!payoutAccount || payoutAccount.status !== 'approved') {
    throw { statusCode: 403, message: 'Add and verify your payout bank details before going online' };
  }

  await db.update(drivers).set({
    isOnline: true, currentLat: String(lat), currentLng: String(lng), lastLocationAt: new Date(),
  }).where(eq(drivers.id, driverId));

  await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
  await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: true, lat, lng });
  return { isOnline: true };
}

export async function goOffline(driverId) {
  await db.update(drivers).set({ isOnline: false }).where(eq(drivers.id, driverId));
  await redis.del(REDIS_KEYS.driverLocation(driverId));
  await publishEvent(TOPICS.DRIVER_STATUS_CHANGED, { driverId, isOnline: false });
  return { isOnline: false };
}

export async function updateLocation(driverId, lat, lng) {
  await redis.setex(REDIS_KEYS.driverLocation(driverId), 30, JSON.stringify({ lat, lng }));
  // Batch DB write — we only need to update DB every 30s, real-time from Redis
  await db.update(drivers).set({
    currentLat: String(lat), currentLng: String(lng), lastLocationAt: new Date(),
  }).where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.DRIVER_LOCATION, { driverId, lat, lng, ts: Date.now() });
  return { updated: true };
}

export async function updateFcmToken(driverId, fcmToken) {
  await db.update(drivers).set({ fcmToken }).where(eq(drivers.id, driverId));
  return { updated: true };
}

// ── Admin facing ─────────────────────────────────────────────────────────────

export async function adminRegisterDriver(adminId, data) {
  const { name, phone, email } = data;
  if (!name) throw { statusCode: 400, message: 'name is required' };
  if (!phone && !email) throw { statusCode: 400, message: 'phone or email is required' };

  if (phone) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.phone, phone)).limit(1);
    if (existing) throw { statusCode: 409, code: 'PHONE_TAKEN', message: 'A driver with this phone already exists' };
  }
  if (email) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.email, email)).limit(1);
    if (existing) throw { statusCode: 409, code: 'EMAIL_TAKEN', message: 'A driver with this email already exists' };
  }

  // vehicleTypeId/vehicleModel are resolved from the catalog, not taken from the client —
  // same fraud-prevention rule as the driver's own vehicle submission (see vehicle.service.js).
  let vehicleTypeId, vehicleModel;
  if (data.vehicleModelId) {
    const [vm] = await db.select().from(vehicleModels).where(eq(vehicleModels.id, data.vehicleModelId)).limit(1);
    if (!vm || !vm.isActive) throw { statusCode: 400, message: 'Invalid vehicle model' };
    vehicleTypeId = vm.vehicleTypeId;
    vehicleModel = vm.name;
  }

  const [driver] = await db.insert(drivers).values({
    name, phone, email,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    preferredLanguageCode: data.preferredLanguageCode,
    countryId: data.countryId,
    stateId: data.stateId,
    cityId: data.cityId,
    vehicleTypeId,
    vehicleNumber: data.vehicleNumber,
    vehicleModel,
    vehicleYear: data.vehicleYear,
    registrationStatus: 'registration_in_progress',
    registrationStep: REGISTRATION_STEP.PERSONAL_INFO,
    approvalStatus: 'pending',
  }).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_REGISTERED_BY_ADMIN', entityType: 'driver', entityId: driver.id,
  });
  return driver;
}

export async function listDrivers(filters, page, limit, offset) {
  const conditions = [];
  if (filters.approvalStatus) conditions.push(eq(drivers.approvalStatus, filters.approvalStatus));
  if (filters.subscriptionStatus) conditions.push(eq(drivers.subscriptionStatus, filters.subscriptionStatus));
  if (filters.registrationStatus) conditions.push(eq(drivers.registrationStatus, filters.registrationStatus));
  if (filters.countryId) conditions.push(eq(drivers.countryId, filters.countryId));
  if (filters.stateId) conditions.push(eq(drivers.stateId, filters.stateId));
  if (filters.cityId) conditions.push(eq(drivers.cityId, filters.cityId));
  if (filters.isBlocked !== undefined) conditions.push(eq(drivers.isBlocked, filters.isBlocked));
  if (filters.search) {
    conditions.push(
      or(
        ilike(drivers.name, `%${filters.search}%`),
        ilike(drivers.email, `%${filters.search}%`),
        ilike(drivers.phone, `%${filters.search}%`)
      )
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(drivers).where(where);
  const rows = await db.select().from(drivers).where(where)
    .orderBy(desc(drivers.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function getDriverDetail(driverId) {
  const summary = await getRegistrationSummary(driverId);
  const driver = summary.driver;

  // Resolve location names (Country, State, City)
  let countryName = null, stateName = null, cityName = null;
  if (driver.countryId) {
    const [c] = await db.select({ name: countries.name }).from(countries).where(eq(countries.id, driver.countryId)).limit(1);
    countryName = c?.name || null;
  }
  if (driver.cityId) {
    const [ct] = await db.select({ name: cities.name }).from(cities).where(eq(cities.id, driver.cityId)).limit(1);
    cityName = ct?.name || null;
  }

  // Get active bank details
  let bankAccount = null;
  try {
    const { driverBankAccounts } = await import('../../../drizzle/schema/driver-bank-accounts.js');
    const [ba] = await db.select().from(driverBankAccounts)
      .where(eq(driverBankAccounts.driverId, driverId))
      .orderBy(desc(driverBankAccounts.createdAt))
      .limit(1);
    bankAccount = ba || null;
  } catch {}

  // Get recent trips for this driver
  let recentRides = [];
  try {
    const rawRides = await db.select({
      id: rides.id,
      status: rides.status,
      pickupAddress: rides.pickupAddress,
      dropAddress: rides.dropAddress,
      estimatedFareMinor: rides.estimatedFareMinor,
      finalFareMinor: rides.finalFareMinor,
      currencyCode: rides.currencyCode,
      requestedAt: rides.requestedAt,
      completedAt: rides.completedAt,
    }).from(rides)
      .where(eq(rides.driverId, driverId))
      .orderBy(desc(rides.requestedAt))
      .limit(20);

    recentRides = rawRides.map((r) => {
      let reqDate = r.requestedAt ? new Date(r.requestedAt) : null;
      let compDate = r.completedAt ? new Date(r.completedAt) : null;

      // Fix legacy skew if requestedAt was saved in local time (+5.5h) while completedAt was saved in UTC
      if (reqDate && compDate && reqDate.getTime() > compDate.getTime()) {
        const diffMs = reqDate.getTime() - compDate.getTime();
        if (diffMs > 0 && diffMs <= 6 * 3600 * 1000) {
          reqDate = new Date(compDate.getTime() - 10 * 60 * 1000); // 10 mins before completion
        }
      }

      return {
        ...r,
        requestedAt: reqDate ? reqDate.toISOString() : null,
        completedAt: compDate ? compDate.toISOString() : null,
      };
    });
  } catch {}

  // Performance totals
  let completedTrips = 0;
  let cancelledTrips = 0;
  let lifetimeEarningsMinor = 0;
  try {
    const [completedRidesResult] = await db.select({ total: count() }).from(rides)
      .where(and(eq(rides.driverId, driverId), eq(rides.status, 'completed')));
    const [cancelledRidesResult] = await db.select({ total: count() }).from(rides)
      .where(and(eq(rides.driverId, driverId), eq(rides.status, 'cancelled')));
    const [earningsResult] = await db.select({
      totalEarningsMinor: sql`COALESCE(SUM(final_fare_minor), 0)::bigint`,
    }).from(rides)
      .where(and(eq(rides.driverId, driverId), eq(rides.status, 'completed')));

    completedTrips = Number(completedRidesResult?.total || 0);
    cancelledTrips = Number(cancelledRidesResult?.total || 0);
    lifetimeEarningsMinor = Number(earningsResult?.totalEarningsMinor || 0);
  } catch {}

  const totalRidesCount = Number(driver.totalRides || 0);
  const totalHandled = completedTrips + cancelledTrips;
  const completionRate = totalHandled > 0 ? Math.round((completedTrips / totalHandled) * 100) : 100;
  const acceptanceRate = 98;

  return {
    ...summary,
    driver: {
      ...driver,
      countryName,
      stateName,
      cityName,
    },
    bankAccount,
    trips: recentRides || [],
    performance: {
      totalTrips: totalRidesCount || completedTrips,
      completedTrips,
      cancelledTrips,
      completionRate,
      acceptanceRate,
      lifetimeEarningsMinor,
      rating: driver.rating ? parseFloat(driver.rating).toFixed(1) : '5.0',
      totalRatings: driver.totalRatings || 0,
    },
  };
}

export async function approveDriver(driverId, adminId, note) {
  const [driver] = await db.update(drivers).set({
    approvalStatus: 'approved', registrationStatus: 'approved',
    approvedBy: adminId, approvedAt: new Date(), approvalNote: note,
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Account Approved!', body: 'You can now go online and accept rides.',
    type: 'ACCOUNT_APPROVED',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_APPROVED', entityType: 'driver', entityId: driverId,
  });
  return driver;
}

export async function rejectDriver(driverId, adminId, note) {
  const [driver] = await db.update(drivers).set({
    approvalStatus: 'rejected', registrationStatus: 'rejected',
    approvedBy: adminId, approvalNote: note,
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Application Rejected', body: note || 'Please contact support.',
    type: 'ACCOUNT_REJECTED',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_REJECTED', entityType: 'driver', entityId: driverId,
  });
  return driver;
}

export async function requestMoreDocuments(driverId, adminId, documentTypeCodes, note) {
  const [driver] = await db.update(drivers).set({
    registrationStatus: 'documents_pending', updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Additional documents needed',
    body: note || `Please upload: ${documentTypeCodes.join(', ')}`,
    type: 'DOCUMENTS_REQUESTED',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DOCUMENTS_REQUESTED', entityType: 'driver', entityId: driverId,
    meta: { documentTypeCodes, note },
  });
  return driver;
}

export async function blockDriver(driverId, adminId) {
  await db.update(drivers).set({ isBlocked: true, isOnline: false, registrationStatus: 'suspended' })
    .where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_BLOCKED', entityType: 'driver', entityId: driverId,
  });
  return { blocked: true };
}

export async function unblockDriver(driverId, adminId) {
  await db.update(drivers).set({ isBlocked: false, registrationStatus: 'active' })
    .where(eq(drivers.id, driverId));
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_UNBLOCKED', entityType: 'driver', entityId: driverId,
  });
  return { blocked: false };
}

export async function setDriverPending(driverId, adminId, note) {
  const [driver] = await db.update(drivers).set({
    approvalStatus: 'pending',
    registrationStatus: 'pending_review',
    approvedBy: adminId,
    approvalNote: note || 'Reset to pending review by admin',
    updatedAt: new Date(),
  }).where(eq(drivers.id, driverId)).returning();

  if (!driver) throw { statusCode: 404, message: 'Driver not found' };

  await publishEvent(TOPICS.NOTIF_PUSH, {
    userId: driverId, userType: 'driver',
    title: 'Application Status Updated',
    body: note || 'Your driver application has been reset to pending review.',
    type: 'ACCOUNT_PENDING_REVIEW',
  });
  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_STATUS_RESET_PENDING', entityType: 'driver', entityId: driverId,
    meta: { note },
  });
  return driver;
}

export async function adminUpdateDriver(driverId, adminId, data) {
  const [existingDriver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!existingDriver) throw { statusCode: 404, message: 'Driver not found' };

  if (data.phone && data.phone !== existingDriver.phone) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers)
      .where(and(eq(drivers.phone, data.phone), ne(drivers.id, driverId))).limit(1);
    if (existing) throw { statusCode: 409, code: 'PHONE_TAKEN', message: 'A driver with this phone already exists' };
  }

  if (data.email && data.email !== existingDriver.email) {
    const [existing] = await db.select({ id: drivers.id }).from(drivers)
      .where(and(eq(drivers.email, data.email), ne(drivers.id, driverId))).limit(1);
    if (existing) throw { statusCode: 409, code: 'EMAIL_TAKEN', message: 'A driver with this email already exists' };
  }

  const allowedFields = [
    'name', 'phone', 'email', 'profilePhoto', 'status',
    'dateOfBirth', 'gender', 'referralCode', 'preferredLanguageCode',
    'countryId', 'stateId', 'cityId',
    'registrationStatus', 'registrationStep',
    'licenseNumber', 'licenseDoc', 'aadharNumber', 'aadharDoc',
    'vehicleTypeId', 'vehicleNumber', 'vehicleModel', 'vehiclePhoto', 'vehicleYear',
    'approvalStatus', 'approvalNote',
    'isOnline', 'isBlocked',
    'rating', 'totalRatings', 'totalRides',
    'subscriptionStatus',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  if (updates.approvalStatus === 'approved' && existingDriver.approvalStatus !== 'approved') {
    updates.approvedBy = adminId;
    updates.approvedAt = new Date();
    if (!updates.registrationStatus) updates.registrationStatus = 'approved';
  } else if (updates.approvalStatus === 'rejected' && existingDriver.approvalStatus !== 'rejected') {
    updates.approvedBy = adminId;
    if (!updates.registrationStatus) updates.registrationStatus = 'rejected';
  } else if (updates.approvalStatus === 'pending' && existingDriver.approvalStatus !== 'pending') {
    updates.approvedBy = adminId;
    if (!updates.registrationStatus) updates.registrationStatus = 'pending_review';
  }

  updates.updatedAt = new Date();

  const [updatedDriver] = await db.update(drivers).set(updates).where(eq(drivers.id, driverId)).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: adminId, actorType: 'admin',
    action: 'DRIVER_UPDATED_BY_ADMIN', entityType: 'driver', entityId: driverId,
    meta: { changes: Object.keys(updates) },
  });

  return updatedDriver;
}

