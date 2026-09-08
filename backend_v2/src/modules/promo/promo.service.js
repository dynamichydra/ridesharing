import { eq, and, or, isNull, count, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { promos, promoUsages, referrals, users, cities, vehicleTypes, countries, rides } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { publishNotification } from '../notification/notification-events.js';
import { formatMoney } from '../../utils/money.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';
import { getOrCreateWalletAccount, getOrCreateSystemAccount, postTransaction } from '../ledger/ledger.service.js';

// ── Rider — Validate Promo Code ───────────────────────────────────────────────

export async function validatePromoCode(code, fareMinor, userId, contextOrCountryId = null) {
  if (!code) throw { statusCode: 400, message: 'Promo code is required' };
  if (fareMinor == null || fareMinor < 0) throw { statusCode: 400, message: 'fareMinor must be a non-negative integer' };

  let countryId = null;
  let cityId = null;
  let vehicleTypeId = null;

  if (contextOrCountryId && typeof contextOrCountryId === 'object') {
    countryId = contextOrCountryId.countryId || null;
    cityId = contextOrCountryId.cityId || null;
    vehicleTypeId = contextOrCountryId.vehicleTypeId || null;
  } else {
    countryId = contextOrCountryId;
  }

  const cleanCode = String(code).trim().toUpperCase();
  const [promo] = await db.select().from(promos).where(eq(promos.code, cleanCode)).limit(1);

  if (!promo || !promo.isActive) {
    throw { statusCode: 404, message: 'Invalid or inactive promo code' };
  }

  const now = new Date();
  if (promo.validFrom && new Date(promo.validFrom) > now) {
    throw { statusCode: 400, message: 'This promo code is not active yet' };
  }
  if (promo.validUntil && new Date(promo.validUntil) < now) {
    throw { statusCode: 400, message: 'This promo code has expired' };
  }

  // 1. Regional country check
  if (promo.countryId && countryId && promo.countryId !== countryId) {
    throw { statusCode: 400, message: 'This promo code is not valid in your country' };
  }

  // 2. City check
  if (promo.cityId && cityId && promo.cityId !== cityId) {
    throw { statusCode: 400, message: 'This promo code is not valid in your city' };
  }

  // 3. Vehicle class check
  if (promo.vehicleTypeId && vehicleTypeId && promo.vehicleTypeId !== vehicleTypeId) {
    throw { statusCode: 400, message: 'This promo code is not valid for the selected vehicle category' };
  }

  // 4. First-ride only validation
  if (promo.isFirstRideOnly && userId) {
    const [{ completedRides }] = await db.select({ completedRides: count() })
      .from(rides)
      .where(and(eq(rides.riderId, userId), eq(rides.status, 'completed')));
    if (completedRides > 0) {
      throw { statusCode: 400, message: 'This promo code is only valid for your first trip' };
    }
  }

  if (fareMinor < promo.minFareMinor) {
    throw {
      statusCode: 400,
      message: `Minimum fare of ${promo.minFareMinor} required for this promo code`,
    };
  }

  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    throw { statusCode: 400, message: 'This promo code has reached its maximum global usage limit' };
  }

  if (userId) {
    const [{ count: userUsedCount }] = await db.select({ count: count() })
      .from(promoUsages)
      .where(and(eq(promoUsages.promoId, promo.id), eq(promoUsages.userId, userId)));

    if (userUsedCount >= promo.perUserLimit) {
      throw {
        statusCode: 409,
        code: 'PROMO_ALREADY_APPLIED',
        message: 'You have already used this promo code',
        alreadyApplied: true,
        userUsageCount: userUsedCount,
        perUserLimit: promo.perUserLimit,
      };
    }
  }

  let discountAmountMinor = 0;
  if (promo.discountType === 'percentage') {
    const rawDiscount = Math.round(fareMinor * (promo.discountValue / 100));
    discountAmountMinor = promo.maxDiscountMinor ? Math.min(rawDiscount, promo.maxDiscountMinor) : rawDiscount;
  } else if (promo.discountType === 'flat_amount') {
    discountAmountMinor = Math.min(fareMinor, promo.discountValue);
  }

  const finalFareMinor = Math.max(0, fareMinor - discountAmountMinor);

  return {
    promoId: promo.id,
    code: promo.code,
    description: promo.description,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmountMinor,
    originalFareMinor: fareMinor,
    finalFareMinor,
    alreadyApplied: false,
  };
}

export async function listAvailablePromosForUser(userId, { countryId = null, cityId = null, vehicleTypeId = null } = {}) {
  const now = new Date();
  const conditions = [
    eq(promos.isActive, true),
    or(isNull(promos.validFrom), lte(promos.validFrom, now)),
    or(isNull(promos.validUntil), gte(promos.validUntil, now)),
  ];

  if (countryId) conditions.push(or(isNull(promos.countryId), eq(promos.countryId, countryId)));
  if (cityId) conditions.push(or(isNull(promos.cityId), eq(promos.cityId, cityId)));
  if (vehicleTypeId) conditions.push(or(isNull(promos.vehicleTypeId), eq(promos.vehicleTypeId, vehicleTypeId)));

  const activePromos = await db.select().from(promos).where(and(...conditions)).orderBy(desc(promos.createdAt));

  let completedRidesCount = 0;
  if (userId) {
    const [{ completedRides }] = await db.select({ completedRides: count() })
      .from(rides)
      .where(and(eq(rides.riderId, userId), eq(rides.status, 'completed')));
    completedRidesCount = completedRides || 0;
  }

  const userUsageRows = userId ? await db.select({
    promoId: promoUsages.promoId,
    usageCount: count(),
  }).from(promoUsages).where(eq(promoUsages.userId, userId)).groupBy(promoUsages.promoId) : [];

  const usageMap = Object.fromEntries(userUsageRows.map((r) => [r.promoId, Number(r.usageCount)]));

  return activePromos.map((p) => {
    const userUsedCount = usageMap[p.id] || 0;
    const isGlobalLimitReached = p.usageLimit != null && p.usedCount >= p.usageLimit;
    const isUserLimitReached = userUsedCount >= p.perUserLimit;
    const isFirstRideViolation = p.isFirstRideOnly && completedRidesCount > 0;
    const alreadyApplied = userUsedCount > 0;
    const canApply = !isGlobalLimitReached && !isUserLimitReached && !isFirstRideViolation;

    return {
      id: p.id,
      code: p.code,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      maxDiscountMinor: p.maxDiscountMinor,
      minFareMinor: p.minFareMinor,
      validUntil: p.validUntil,
      perUserLimit: p.perUserLimit,
      isFirstRideOnly: p.isFirstRideOnly,
      userUsedCount,
      alreadyApplied,
      canApply,
      statusLabel: isUserLimitReached
        ? 'Already Used'
        : isFirstRideViolation
        ? 'First Ride Only'
        : isGlobalLimitReached
        ? 'Offer Expired'
        : 'Available',
    };
  });
}

export async function recordPromoUsage(promoId, userId, rideId, discountAmountMinor) {
  return db.transaction(async (tx) => {
    const [inserted] = await tx.insert(promoUsages).values({
      promoId,
      userId,
      rideId,
      discountAmountMinor,
    }).onConflictDoNothing().returning();

    if (inserted) {
      await tx.update(promos)
        .set({ usedCount: sql`${promos.usedCount} + 1`, updatedAt: new Date() })
        .where(eq(promos.id, promoId));
    }

    return inserted || null;
  });
}

// ── Referrals ─────────────────────────────────────────────────────────────────

export function generateReferralCodeForUser(userId) {
  const shortId = userId.replace(/-/g, '').slice(0, 6).toUpperCase();
  return `REF-${shortId}`;
}

export async function getMyReferralInfo(userId) {
  const code = generateReferralCodeForUser(userId);
  const userReferrals = await db.select().from(referrals).where(eq(referrals.referrerId, userId));

  const totalEarnedMinor = userReferrals
    .filter((r) => r.status === 'completed')
    .reduce((sum, r) => sum + r.rewardAmountMinor, 0);

  return {
    userId,
    referralCode: code,
    totalReferrals: userReferrals.length,
    completedReferrals: userReferrals.filter((r) => r.status === 'completed').length,
    totalEarnedMinor,
    referrals: userReferrals,
  };
}

export async function applyReferralCode(refereeId, referralCode) {
  if (!referralCode) throw { statusCode: 400, message: 'Referral code is required' };
  const cleanCode = String(referralCode).trim().toUpperCase();

  // Fast direct indexed lookup: check users.referralCode or legacy REF-<shortPrefix>
  let [referrer] = await db.select().from(users).where(eq(users.referralCode, cleanCode)).limit(1);

  if (!referrer && cleanCode.startsWith('REF-')) {
    const shortPrefix = cleanCode.replace('REF-', '').toLowerCase();
    const [matched] = await db.select().from(users).where(sql`replace(${users.id}::text, '-', '') ILIKE ${shortPrefix + '%'}`).limit(1);
    referrer = matched;
  }

  if (!referrer) throw { statusCode: 404, message: 'Invalid referral code' };
  if (referrer.id === refereeId) throw { statusCode: 400, message: 'You cannot use your own referral code' };

  const [existing] = await db.select().from(referrals).where(eq(referrals.refereeId, refereeId)).limit(1);
  if (existing) throw { statusCode: 409, message: 'You have already applied a referral code' };

  const [ref] = await db.insert(referrals).values({
    referrerId: referrer.id,
    refereeId,
    referralCode: cleanCode,
    status: 'pending',
    rewardAmountMinor: 500, // $5.00 / ₹50 reward
  }).returning();

  return ref;
}

export async function processReferralRewardOnFirstRide(refereeId, currencyCode = 'USD') {
  const [pendingRef] = await db.select().from(referrals)
    .where(and(eq(referrals.refereeId, refereeId), eq(referrals.status, 'pending'))).limit(1);

  if (!pendingRef) return null;

  await db.update(referrals)
    .set({ status: 'completed', completedAt: new Date() })
    .where(eq(referrals.id, pendingRef.id));

  const rewardAmount = pendingRef.rewardAmountMinor;

  // Credit both referrer and referee wallets
  for (const targetUserId of [pendingRef.referrerId, refereeId]) {
    const wallet = await getOrCreateWallet('rider', targetUserId);
    const [walletAccount, expenseAccount] = await Promise.all([
      getOrCreateWalletAccount(wallet.id, currencyCode),
      getOrCreateSystemAccount('referral_bonus_expense', currencyCode),
    ]);

    await postTransaction({
      businessType: 'referral_bonus',
      idempotencyKey: `referral_bonus:${pendingRef.id}:${targetUserId}`,
      referenceType: 'referral',
      referenceId: pendingRef.id,
      entries: [
        { accountId: expenseAccount.id, direction: 'debit', amountMinor: rewardAmount, currencyCode },
        { accountId: walletAccount.id, direction: 'credit', amountMinor: rewardAmount, currencyCode, reason: 'referral_bonus', description: 'Referral reward bonus' },
      ],
    });

    await publishNotification('REFERRAL_REWARD', {
      userId: targetUserId,
      userType: 'rider',
      variables: { amount: formatMoney(rewardAmount, currencyCode) },
    }).catch(() => {});
  }

  return pendingRef;
}

// ── Admin — Promo CRUD ────────────────────────────────────────────────────────

export async function createPromo(data) {
  if (!data.code) throw { statusCode: 400, message: 'Promo code is required' };

  const rawType = String(data.discountType || '').toLowerCase();
  const discountType = (rawType === 'percentage' || rawType === 'percent')
    ? 'percentage'
    : (rawType === 'flat' || rawType === 'flat_amount')
      ? 'flat_amount'
      : rawType;

  if (!['percentage', 'flat_amount'].includes(discountType)) {
    throw { statusCode: 400, message: 'discountType must be percentage or flat_amount' };
  }

  const rawVal = data.discountValue != null ? data.discountValue : data.discountValueMinor;
  const discountValue = parseInt(rawVal, 10);
  if (isNaN(discountValue) || discountValue <= 0) {
    throw { statusCode: 400, message: 'discountValue must be a positive integer' };
  }

  const cleanCode = String(data.code).trim().toUpperCase();
  const [existing] = await db.select().from(promos).where(eq(promos.code, cleanCode)).limit(1);
  if (existing) throw { statusCode: 409, message: 'Promo code already exists' };

  const usageLimit = data.usageLimit != null
    ? parseInt(data.usageLimit, 10)
    : (data.maxUses != null ? parseInt(data.maxUses, 10) : null);

  const validUntil = data.validUntil
    ? new Date(data.validUntil)
    : (data.expiresAt ? new Date(data.expiresAt) : null);

  const validFrom = data.validFrom
    ? new Date(data.validFrom)
    : (data.startsAt ? new Date(data.startsAt) : new Date());

  const [promo] = await db.insert(promos).values({
    code: cleanCode,
    description: data.description || null,
    discountType,
    discountValue,
    maxDiscountMinor: data.maxDiscountMinor || null,
    minFareMinor: data.minFareMinor || 0,
    usageLimit,
    perUserLimit: data.perUserLimit || 1,
    isFirstRideOnly: Boolean(data.isFirstRideOnly),
    validFrom,
    validUntil,
    countryId: data.countryId || null,
    cityId: data.cityId || null,
    vehicleTypeId: data.vehicleTypeId || null,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  }).returning();

  return {
    ...promo,
    discountValueMinor: promo.discountValue,
    maxUses: promo.usageLimit,
    expiresAt: promo.validUntil ? promo.validUntil.toISOString() : null,
    startsAt: promo.validFrom ? promo.validFrom.toISOString() : null,
  };
}

export async function listPromos(filters, page, limit, offset) {
  const conditions = [];
  if (filters.isActive !== undefined && filters.isActive !== '') {
    conditions.push(eq(promos.isActive, String(filters.isActive) === 'true'));
  }
  if (filters.countryId) conditions.push(eq(promos.countryId, filters.countryId));
  if (filters.cityId) conditions.push(eq(promos.cityId, filters.cityId));
  if (filters.vehicleTypeId) conditions.push(eq(promos.vehicleTypeId, filters.vehicleTypeId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(promos).where(where);
  const rawRows = await db
    .select({
      promo: promos,
      country: countries,
      city: cities,
      vehicleType: vehicleTypes,
    })
    .from(promos)
    .leftJoin(countries, eq(promos.countryId, countries.id))
    .leftJoin(cities, eq(promos.cityId, cities.id))
    .leftJoin(vehicleTypes, eq(promos.vehicleTypeId, vehicleTypes.id))
    .where(where)
    .orderBy(desc(promos.createdAt))
    .limit(limit)
    .offset(offset);

  const rows = rawRows.map(({ promo: r, country, city, vehicleType }) => ({
    ...r,
    country,
    city,
    vehicleType,
    discountValueMinor: r.discountValue,
    maxUses: r.usageLimit,
    expiresAt: r.validUntil ? r.validUntil.toISOString() : null,
    startsAt: r.validFrom ? r.validFrom.toISOString() : null,
  }));

  return { rows, pagination: paginate(page, limit, total) };
}

export async function updatePromo(id, updates) {
  const [existing] = await db.select().from(promos).where(eq(promos.id, id)).limit(1);
  if (!existing) throw { statusCode: 404, message: 'Promo not found' };

  const patch = { updatedAt: new Date() };

  if (updates.code) patch.code = String(updates.code).trim().toUpperCase();
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.isActive !== undefined) patch.isActive = Boolean(updates.isActive);
  if (updates.countryId !== undefined) patch.countryId = updates.countryId || null;
  if (updates.cityId !== undefined) patch.cityId = updates.cityId || null;
  if (updates.vehicleTypeId !== undefined) patch.vehicleTypeId = updates.vehicleTypeId || null;
  if (updates.isFirstRideOnly !== undefined) patch.isFirstRideOnly = Boolean(updates.isFirstRideOnly);

  if (updates.discountType) {
    const rawType = String(updates.discountType).toLowerCase();
    patch.discountType = (rawType === 'percentage' || rawType === 'percent') ? 'percentage' : 'flat_amount';
  }

  const rawVal = updates.discountValue != null ? updates.discountValue : updates.discountValueMinor;
  if (rawVal != null) patch.discountValue = parseInt(rawVal, 10);

  if (updates.minFareMinor !== undefined) patch.minFareMinor = updates.minFareMinor ? parseInt(updates.minFareMinor, 10) : 0;
  if (updates.maxDiscountMinor !== undefined) patch.maxDiscountMinor = updates.maxDiscountMinor ? parseInt(updates.maxDiscountMinor, 10) : null;

  const usageLimit = updates.usageLimit !== undefined ? updates.usageLimit : updates.maxUses;
  if (usageLimit !== undefined) patch.usageLimit = usageLimit ? parseInt(usageLimit, 10) : null;

  if (updates.perUserLimit !== undefined) patch.perUserLimit = parseInt(updates.perUserLimit, 10);

  const validUntil = updates.validUntil !== undefined ? updates.validUntil : updates.expiresAt;
  if (validUntil !== undefined) patch.validUntil = validUntil ? new Date(validUntil) : null;

  const validFrom = updates.validFrom !== undefined ? updates.validFrom : updates.startsAt;
  if (validFrom !== undefined) patch.validFrom = validFrom ? new Date(validFrom) : null;

  const [updated] = await db.update(promos).set(patch).where(eq(promos.id, id)).returning();
  return {
    ...updated,
    discountValueMinor: updated.discountValue,
    maxUses: updated.usageLimit,
    expiresAt: updated.validUntil ? updated.validUntil.toISOString() : null,
    startsAt: updated.validFrom ? updated.validFrom.toISOString() : null,
  };
}

export async function deletePromo(id) {
  const [deleted] = await db.delete(promos).where(eq(promos.id, id)).returning();
  if (!deleted) throw { statusCode: 404, message: 'Promo not found' };
  return deleted;
}
