import { eq, and, or } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { paymentMethods } from '../../../drizzle/schema/index.js';
import { getMerchantAccountId } from '../payment/payment-region.service.js';

export async function savePaymentMethod(data) {
  const ownerCondition = data.userId
    ? eq(paymentMethods.userId, data.userId)
    : eq(paymentMethods.driverId, data.driverId);

  const merchantAccountId = data.merchantAccountId || getMerchantAccountId(data.gateway);
  const fingerprint = data.fingerprint || null;

  // 1. Check for duplicate saved card (token or canonical fingerprint within same merchant account)
  const existingConditions = [
    ownerCondition,
    eq(paymentMethods.gateway, data.gateway),
    eq(paymentMethods.isActive, true),
  ];

  if (fingerprint) {
    existingConditions.push(
      or(
        eq(paymentMethods.paymentMethodToken, data.paymentMethodToken),
        and(
          eq(paymentMethods.merchantAccountId, merchantAccountId),
          eq(paymentMethods.fingerprint, fingerprint)
        )
      )
    );
  } else {
    existingConditions.push(eq(paymentMethods.paymentMethodToken, data.paymentMethodToken));
  }

  const [existing] = await db.select().from(paymentMethods)
    .where(and(...existingConditions))
    .limit(1);

  if (existing) {
    // If requested as default, update default status while preserving other cards
    if (data.isDefault && !existing.isDefault) {
      await db.update(paymentMethods).set({ isDefault: false }).where(ownerCondition);
      const [updated] = await db.update(paymentMethods)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(eq(paymentMethods.id, existing.id))
        .returning();
      return { ...updated, duplicatePrevented: true };
    }
    return { ...existing, duplicatePrevented: true };
  }

  // 2. Unset other defaults if this new one is marked default
  if (data.isDefault) {
    await db.update(paymentMethods).set({ isDefault: false }).where(ownerCondition);
  }

  // 3. Insert new method, safely handling concurrent race condition (unique index violation code 23505)
  try {
    const [newMethod] = await db.insert(paymentMethods).values({
      ...data,
      merchantAccountId,
      fingerprint,
      isActive: true,
      updatedAt: new Date(),
    }).returning();
    return newMethod;
  } catch (err) {
    if (err.code === '23505') {
      // Concurrent insert won the race: retrieve and return the winning row
      const [raceWinner] = await db.select().from(paymentMethods)
        .where(and(
          ownerCondition,
          eq(paymentMethods.gateway, data.gateway),
          eq(paymentMethods.paymentMethodToken, data.paymentMethodToken),
          eq(paymentMethods.isActive, true),
        ))
        .limit(1);
      if (raceWinner) {
        if (data.isDefault && !raceWinner.isDefault) {
          await db.update(paymentMethods).set({ isDefault: false }).where(ownerCondition);
          const [updated] = await db.update(paymentMethods)
            .set({ isDefault: true, updatedAt: new Date() })
            .where(eq(paymentMethods.id, raceWinner.id))
            .returning();
          return { ...updated, duplicatePrevented: true };
        }
        return { ...raceWinner, duplicatePrevented: true };
      }
    }
    throw err;
  }
}

export async function listPaymentMethods(userId, role) {
  const condition = role === 'rider'
    ? eq(paymentMethods.userId, userId)
    : eq(paymentMethods.driverId, userId);

  return db.select().from(paymentMethods)
    .where(and(condition, eq(paymentMethods.isActive, true)))
    .orderBy(paymentMethods.createdAt);
}

export async function setPreferredPaymentMethod(id, userId, role) {
  const condition = role === 'rider'
    ? eq(paymentMethods.userId, userId)
    : eq(paymentMethods.driverId, userId);

  const [target] = await db.select().from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), condition, eq(paymentMethods.isActive, true)))
    .limit(1);

  if (!target) {
    const error = new Error('Payment method not found or does not belong to you');
    error.statusCode = 404;
    throw error;
  }

  // Unset all other defaults for this user
  await db.update(paymentMethods).set({ isDefault: false }).where(condition);

  // Set selected as default
  const [updated] = await db.update(paymentMethods)
    .set({ isDefault: true, updatedAt: new Date() })
    .where(eq(paymentMethods.id, id))
    .returning();

  return updated;
}

export async function removePaymentMethod(id, userId, role) {
  const condition = role === 'rider'
    ? eq(paymentMethods.userId, userId)
    : eq(paymentMethods.driverId, userId);

  const [existing] = await db.select().from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), condition))
    .limit(1);

  if (!existing) {
    const error = new Error('Payment method not found or does not belong to you');
    error.statusCode = 404;
    throw error;
  }

  // Soft-delete: mark as inactive and set revokedAt, unset isDefault
  const [revoked] = await db.update(paymentMethods).set({
    isActive: false,
    isDefault: false,
    revokedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(paymentMethods.id, id)).returning();

  return revoked;
}

export async function getPaymentMethodById(id, userId, role) {
  const condition = role === 'rider'
    ? eq(paymentMethods.userId, userId)
    : eq(paymentMethods.driverId, userId);

  const [method] = await db.select().from(paymentMethods)
    .where(and(eq(paymentMethods.id, id), condition, eq(paymentMethods.isActive, true)))
    .limit(1);

  return method || null;
}
