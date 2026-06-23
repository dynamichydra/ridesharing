import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { users, drivers, admins } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import { generateOtp, storeOtp, verifyOtp, sendOtpSms } from '../../utils/otp.js';
import { env } from '../../config/env.js';

// ── Rider / Driver OTP flow ──────────────────────────────────────────────────

export async function sendOtp(phone) {
  const otp = generateOtp();
  await storeOtp(phone, otp);
  await sendOtpSms(phone, otp);
  return { sent: true };
}

export async function verifyRiderOtp(phone, otp, app) {
  const valid = await verifyOtp(phone, otp);
  if (!valid) throw { statusCode: 400, message: 'Invalid or expired OTP' };

  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  const isNew = !user;

  if (!user) {
    [user] = await db.insert(users).values({ phone, isVerified: true }).returning();
  } else {
    await db.update(users).set({ isVerified: true }).where(eq(users.id, user.id));
  }

  const accessToken = app.jwt.sign({ id: user.id, role: 'rider', phone });
  const refreshToken = app.jwt.sign({ id: user.id, role: 'rider' }, { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  await redis.setex(REDIS_KEYS.refreshToken(user.id), 30 * 86400, refreshToken);

  return { accessToken, refreshToken, isNew, user };
}

export async function verifyDriverOtp(phone, otp, app) {
  const valid = await verifyOtp(phone, otp);
  if (!valid) throw { statusCode: 400, message: 'Invalid or expired OTP' };

  let [driver] = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
  const isNew = !driver;

  if (!driver) {
    [driver] = await db.insert(drivers).values({ phone }).returning();
  }

  const accessToken = app.jwt.sign({ id: driver.id, role: 'driver', phone });
  const refreshToken = app.jwt.sign({ id: driver.id, role: 'driver' }, { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  await redis.setex(REDIS_KEYS.refreshToken(driver.id), 30 * 86400, refreshToken);

  return { accessToken, refreshToken, isNew, driver };
}

export async function refreshTokens(token, app) {
  let payload;
  try {
    payload = app.jwt.verify(token, { secret: env.JWT_REFRESH_SECRET });
  } catch {
    throw { statusCode: 401, message: 'Invalid refresh token' };
  }
  const stored = await redis.get(REDIS_KEYS.refreshToken(payload.id));
  if (!stored || stored !== token) throw { statusCode: 401, message: 'Refresh token revoked' };

  const accessToken = app.jwt.sign({ id: payload.id, role: payload.role });
  return { accessToken };
}

export async function logout(userId) {
  await redis.del(REDIS_KEYS.refreshToken(userId));
}

// ── Admin auth ────────────────────────────────────────────────────────────────

export async function adminLogin(email, password, app) {
  const { createHash } = await import('crypto');

  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (!admin) throw { statusCode: 401, message: 'Invalid credentials' };

  // simple sha256 comparison — swap for bcrypt in production
  const hash = createHash('sha256').update(password).digest('hex');
  if (admin.password !== hash) throw { statusCode: 401, message: 'Invalid credentials' };
  if (!admin.isActive) throw { statusCode: 403, message: 'Account disabled' };

  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));

  const accessToken = app.jwt.sign({ id: admin.id, role: admin.role, email: admin.email });
  return { accessToken, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } };
}
