import { eq, and } from 'drizzle-orm';
import bcrypt                                      from 'bcryptjs';
import { db }                                      from '../../config/db.js';
import { users, drivers, admins, driverDevices }   from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS }                      from '../../config/redis.js';
import { generateOtp, storeOtp, verifyOtp,
         sendOtpSms, assertCanSendOtp, markOtpSent } from '../../utils/otp.js';
import { sendEmailVerification, verifyEmailCode } from '../../utils/emailOtp.js';
import { env }                                    from '../../config/env.js';

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;   // E.164
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertValidPhone(phone) {
  if (!PHONE_REGEX.test(phone)) throw { statusCode: 400, code: 'PHONE_INVALID', message: 'Enter a valid phone number in international format, e.g. +919876543210' };
}
function assertValidEmail(email) {
  if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, code: 'EMAIL_INVALID', message: 'Enter a valid email address' };
}

// ── Rider OTP (unchanged) ──────────────────────────────────────────────────────

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

  const accessToken  = app.jwt.sign({ id: user.id, role: 'rider', phone });
  const refreshToken = app.jwt.sign(
    { id: user.id, role: 'rider' },
    { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
  await redis.setex(REDIS_KEYS.refreshToken(user.id), 30 * 86400, refreshToken);

  return { accessToken, refreshToken, isNew, user };
}

// ── Driver mobile auth (device-scoped) ─────────────────────────────────────────

export async function driverMobileStart(phone, deviceId) {
  assertValidPhone(phone);
  if (!deviceId) throw { statusCode: 400, message: 'deviceId is required' };
  await assertCanSendOtp(phone);

  const [existing] = await db.select({ id: drivers.id }).from(drivers).where(eq(drivers.phone, phone)).limit(1);

  const otp = generateOtp();
  await storeOtp(phone, otp);
  await sendOtpSms(phone, otp);
  await markOtpSent(phone);

  return { sent: true, isNewAccount: !existing, resendAfterSeconds: 30 };
}

export async function driverMobileResend(phone) {
  assertValidPhone(phone);
  await assertCanSendOtp(phone);

  const otp = generateOtp();
  await storeOtp(phone, otp);
  await sendOtpSms(phone, otp);
  await markOtpSent(phone);

  return { sent: true, resendAfterSeconds: 30 };
}

async function upsertDevice(driverId, deviceId, platform, fcmToken, ip) {
  const [existing] = await db.select().from(driverDevices)
    .where(and(eq(driverDevices.driverId, driverId), eq(driverDevices.deviceId, deviceId))).limit(1);

  if (existing) {
    await db.update(driverDevices).set({
      platform, fcmToken, ip, lastLoginAt: new Date(), isRevoked: false,
    }).where(eq(driverDevices.id, existing.id));
  } else {
    await db.insert(driverDevices).values({ driverId, deviceId, platform, fcmToken, ip });
  }
}

async function issueDriverTokens(driver, deviceId, app) {
  const accessToken  = app.jwt.sign({ id: driver.id, role: 'driver', phone: driver.phone });
  const refreshToken = app.jwt.sign(
    { id: driver.id, role: 'driver', deviceId },
    { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
  await redis.setex(REDIS_KEYS.refreshToken(driver.id, deviceId), 30 * 86400, refreshToken);
  return { accessToken, refreshToken };
}

export async function driverMobileVerify(phone, otp, deviceId, platform, fcmToken, ip, app) {
  if (!deviceId) throw { statusCode: 400, message: 'deviceId is required' };
  const valid = await verifyOtp(phone, otp);
  if (!valid) throw { statusCode: 400, code: 'OTP_INVALID', message: 'Invalid or expired OTP' };

  let [driver] = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
  const isNew = !driver;

  if (!driver) {
    [driver] = await db.insert(drivers).values({
      phone, registrationStatus: 'mobile_verified', registrationStep: 1,
    }).returning();
  } else if (driver.registrationStatus === 'new') {
    [driver] = await db.update(drivers).set({
      registrationStatus: 'mobile_verified', registrationStep: Math.max(driver.registrationStep, 1),
    }).where(eq(drivers.id, driver.id)).returning();
  }

  if (driver.isBlocked) throw { statusCode: 403, code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended' };

  await upsertDevice(driver.id, deviceId, platform, fcmToken, ip);
  const tokens = await issueDriverTokens(driver, deviceId, app);

  return {
    ...tokens, isNew, driver,
    registrationStatus: driver.registrationStatus,
    registrationStep: driver.registrationStep,
  };
}

// ── Driver email auth ───────────────────────────────────────────────────────────

export async function driverEmailStart(email) {
  assertValidEmail(email);
  return sendEmailVerification(email);
}

export async function driverEmailVerify(email, code, deviceId, platform, fcmToken, ip, app) {
  if (!deviceId) throw { statusCode: 400, message: 'deviceId is required' };
  const valid = await verifyEmailCode(email, code);
  if (!valid) throw { statusCode: 400, code: 'OTP_INVALID', message: 'Invalid or expired code' };

  let [driver] = await db.select().from(drivers).where(eq(drivers.email, email)).limit(1);
  const isNew = !driver;

  if (!driver) {
    [driver] = await db.insert(drivers).values({
      email,
      registrationStatus: 'email_verified', registrationStep: 1,
    }).returning();
  } else if (driver.registrationStatus === 'new') {
    [driver] = await db.update(drivers).set({
      registrationStatus: 'email_verified', registrationStep: Math.max(driver.registrationStep, 1),
    }).where(eq(drivers.id, driver.id)).returning();
  }

  if (driver.isBlocked) throw { statusCode: 403, code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended' };

  await upsertDevice(driver.id, deviceId, platform, fcmToken, ip);
  const tokens = await issueDriverTokens(driver, deviceId, app);

  return {
    ...tokens, isNew, driver,
    registrationStatus: driver.registrationStatus,
    registrationStep: driver.registrationStep,
  };
}

// ── Legacy driver OTP (kept for backward compatibility with existing clients) ──

export async function verifyDriverOtp(phone, otp, app) {
  const valid = await verifyOtp(phone, otp);
  if (!valid) throw { statusCode: 400, message: 'Invalid or expired OTP' };

  let [driver] = await db.select().from(drivers).where(eq(drivers.phone, phone)).limit(1);
  const isNew = !driver;

  if (!driver) {
    [driver] = await db.insert(drivers).values({ phone, registrationStatus: 'mobile_verified', registrationStep: 1 }).returning();
  }

  const accessToken  = app.jwt.sign({ id: driver.id, role: 'driver', phone });
  const refreshToken = app.jwt.sign(
    { id: driver.id, role: 'driver' },
    { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
  await redis.setex(REDIS_KEYS.refreshToken(driver.id), 30 * 86400, refreshToken);

  return { accessToken, refreshToken, isNew, driver };
}

// ── Device management ───────────────────────────────────────────────────────────

export async function listDriverDevices(driverId) {
  return db.select().from(driverDevices)
    .where(and(eq(driverDevices.driverId, driverId), eq(driverDevices.isRevoked, false)));
}

export async function revokeDriverDevice(driverId, deviceId) {
  await db.update(driverDevices).set({ isRevoked: true })
    .where(and(eq(driverDevices.driverId, driverId), eq(driverDevices.deviceId, deviceId)));
  await redis.del(REDIS_KEYS.refreshToken(driverId, deviceId));
  return { revoked: true };
}

// ── Token management ──────────────────────────────────────────────────────────

export async function refreshTokens(token, app) {
  let payload;
  try {
    payload = app.jwt.verify(token, { secret: env.JWT_REFRESH_SECRET });
  } catch {
    throw { statusCode: 401, message: 'Invalid refresh token' };
  }
  const deviceId = payload.deviceId; // undefined for rider tokens — falls back to 'default' key
  const stored = await redis.get(REDIS_KEYS.refreshToken(payload.id, deviceId));
  if (!stored || stored !== token) throw { statusCode: 401, message: 'Refresh token revoked' };

  const accessToken = app.jwt.sign({ id: payload.id, role: payload.role });
  return { accessToken };
}

export async function logout(userId, deviceId) {
  await redis.del(REDIS_KEYS.refreshToken(userId, deviceId));
}

// ── Admin auth (bcrypt) ───────────────────────────────────────────────────────

export async function adminLogin(email, password, app) {
  const [admin] = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
  if (!admin) throw { statusCode: 401, message: 'Invalid credentials' };

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) throw { statusCode: 401, message: 'Invalid credentials' };
  if (!admin.isActive) throw { statusCode: 403, message: 'Account disabled' };

  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));

  const accessToken = app.jwt.sign({ id: admin.id, role: admin.role, email: admin.email });
  return {
    accessToken,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  };
}
