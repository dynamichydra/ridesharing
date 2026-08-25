import { eq, and, count, desc, gte, lte, sql } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { promos, promoUsages, referrals, users } from '../../../drizzle/schema/index.js';
import { paginate } from '../../utils/response.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';
import { publishNotification } from '../notification/notification-events.js';
import { formatMoney } from '../../utils/money.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';
import { getOrCreateWalletAccount, getOrCreateSystemAccount, postTransaction } from '../ledger/ledger.service.js';

// ── Rider — Validate Promo Code ───────────────────────────────────────────────

export async function validatePromoCode(code, fareMinor, userId, countryId = null) {
  if (!code) throw { statusCode: 400, message: 'Promo code is required' };
  if (fareMinor == null || fareMinor < 0) throw { statusCode: 400, message: 'fareMinor must be a non-negative integer' };

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

  if (promo.countryId && countryId && promo.countryId !== countryId) {
    throw { statusCode: 400, message: 'This promo code is not valid in your region' };
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
      throw { statusCode: 409, message: 'You have reached your personal usage limit for this promo code' };
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
  };
}

export async function recordPromoUsage(promoId, userId, rideId, discountAmountMinor) {
  await db.transaction(async (tx) => {
    await tx.insert(promoUsages).values({
      promoId,
      userId,
      rideId,
      discountAmountMinor,
    });

    await tx.update(promos)
      .set({ usedCount: sql`${promos.usedCount} + 1`, updatedAt: new Date() })
      .where(eq(promos.id, promoId));
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

  const allUsers = await db.select({ id: users.id }).from(users);
  const referrer = allUsers.find((u) => generateReferralCodeForUser(u.id) === cleanCode);

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
  if (!['percentage', 'flat_amount'].includes(data.discountType)) {
    throw { statusCode: 400, message: 'discountType must be percentage or flat_amount' };
  }
  if (!Number.isInteger(data.discountValue) || data.discountValue <= 0) {
    throw { statusCode: 400, message: 'discountValue must be a positive integer' };
  }

  const cleanCode = String(data.code).trim().toUpperCase();
  const [existing] = await db.select().from(promos).where(eq(promos.code, cleanCode)).limit(1);
  if (existing) throw { statusCode: 409, message: 'Promo code already exists' };

  const [promo] = await db.insert(promos).values({
    code: cleanCode,
    description: data.description || null,
    discountType: data.discountType,
    discountValue: data.discountValue,
    maxDiscountMinor: data.maxDiscountMinor || null,
    minFareMinor: data.minFareMinor || 0,
    usageLimit: data.usageLimit || null,
    perUserLimit: data.perUserLimit || 1,
    validFrom: data.validFrom ? new Date(data.validFrom) : new Date(),
    validUntil: data.validUntil ? new Date(data.validUntil) : null,
    countryId: data.countryId || null,
    isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
  }).returning();

  return promo;
}

export async function listPromos(filters, page, limit, offset) {
  const conditions = [];
  if (filters.isActive !== undefined) conditions.push(eq(promos.isActive, filters.isActive === 'true'));
  if (filters.countryId) conditions.push(eq(promos.countryId, filters.countryId));
  const where = conditions.length ? and(...conditions) : undefined;

  const [{ total }] = await db.select({ total: count() }).from(promos).where(where);
  const rows = await db.select().from(promos).where(where)
    .orderBy(desc(promos.createdAt)).limit(limit).offset(offset);

  return { rows, pagination: paginate(page, limit, total) };
}

export async function updatePromo(id, updates) {
  const [existing] = await db.select().from(promos).where(eq(promos.id, id)).limit(1);
  if (!existing) throw { statusCode: 404, message: 'Promo not found' };

  const patch = { updatedAt: new Date() };
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.isActive !== undefined) patch.isActive = Boolean(updates.isActive);
  if (updates.usageLimit !== undefined) patch.usageLimit = updates.usageLimit;
  if (updates.perUserLimit !== undefined) patch.perUserLimit = updates.perUserLimit;
  if (updates.validUntil !== undefined) patch.validUntil = updates.validUntil ? new Date(updates.validUntil) : null;

  const [updated] = await db.update(promos).set(patch).where(eq(promos.id, id)).returning();
  return updated;
}
