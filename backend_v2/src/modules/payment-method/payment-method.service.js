import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { paymentMethods } from '../../../drizzle/schema/index.js';

export async function savePaymentMethod(data) {
  if (data.isDefault) {
    // unset other defaults
    const condition = data.userId 
      ? eq(paymentMethods.userId, data.userId) 
      : eq(paymentMethods.driverId, data.driverId);
    await db.update(paymentMethods).set({ isDefault: false }).where(condition);
  }
  const [newMethod] = await db.insert(paymentMethods).values(data).returning();
  return newMethod;
}

export async function listPaymentMethods(userId, role) {
  const condition = role === 'rider' 
    ? eq(paymentMethods.userId, userId) 
    : eq(paymentMethods.driverId, userId);
    
  return db.select().from(paymentMethods).where(condition).orderBy(paymentMethods.createdAt);
}

export async function removePaymentMethod(id) {
  return db.delete(paymentMethods).where(eq(paymentMethods.id, id));
}
