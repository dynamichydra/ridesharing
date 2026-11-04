import { eq, and, or, like, sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '../../config/db.js';
import { users, drivers, admins, driverDevices, countries } from '../../../drizzle/schema/index.js';
import { redis, REDIS_KEYS } from '../../config/redis.js';
import {
  generateOtp, storeOtp, verifyOtp,
  sendOtpSms, assertCanSendOtp, markOtpSent
} from '../../utils/otp.js';
import { sendEmailVerification, verifyEmailCode } from '../../utils/emailOtp.js';
import { env } from '../../config/env.js';

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;   // E.164
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhone(phone) {
  if (!phone) return '';
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return cleaned;
}

export async function findDriverByPhone(phone) {
  if (!phone) return null;
  const raw = normalizePhone(phone);
  const digitsOnly = raw.replace(/\D/g, '');

  // 1. Direct exact match
  let [driver] = await db.select().from(drivers).where(eq(drivers.phone, raw)).limit(1);
  if (driver) return driver;

  // 2. Canonical internationalized format (+ prefix or digits-only)
  const variations = [];
  if (digitsOnly && digitsOnly !== raw) variations.push(digitsOnly);
  if (digitsOnly && !raw.startsWith('+')) variations.push(`+${digitsOnly}`);
  if (digitsOnly.length === 10) variations.push(`+91${digitsOnly}`, `+1${digitsOnly}`);

  if (variations.length > 0) {
    const matches = await db.select().from(drivers)
      .where(or(...variations.map((v) => eq(drivers.phone, v))))
      .limit(2);
    // A bare 10-digit number can be Indian (+91) or North American (+1) — never guess.
    if (matches.length > 1) {
      throw { statusCode: 409, code: 'PHONE_AMBIGUOUS', message: 'Enter your phone number with the country code, e.g. +919876543210' };
    }
    if (matches.length === 1) return matches[0];
  }

  return null;
}

function assertValidPhone(phone) {
  const norm = normalizePhone(phone);
  if (!PHONE_REGEX.test(norm) && !/^\d{10,15}$/.test(norm)) {
    throw { statusCode: 400, code: 'PHONE_INVALID', message: 'Enter a valid phone number in international format, e.g. +919876543210' };
  }
}

/**
 * Validates that a driver's phone number matches their registered country.
 * Prevents Canadian drivers from registering with Indian numbers (+91),
 * and Indian drivers from registering with Canadian/US numbers (+1).
 */
export async function validateDriverPhoneCountryMatch(phone, countryCodeOrId) {
  if (!phone || !countryCodeOrId) return;

  const normPhone = normalizePhone(phone);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(countryCodeOrId);
  const condition = isUuid
    ? eq(countries.id, countryCodeOrId)
    : eq(countries.isoCode, String(countryCodeOrId).toUpperCase());

  const [country] = await db.select().from(countries).where(condition).limit(1);

  if (!country) return;

  const targetIso = country.isoCode.toUpperCase();
  const dialDigits = country.dialCode.replace(/\D/g, '');
  const digitsOnly = normPhone.replace(/\D/g, '');

  const isDialMatch = normPhone.startsWith(`+${dialDigits}`) ||
    (targetIso === 'IN' && digitsOnly.length === 10) ||
    (targetIso === 'IN' && digitsOnly.length === 12 && digitsOnly.startsWith('91')) ||
    (targetIso === 'CA' && digitsOnly.length === 11 && digitsOnly.startsWith('1'));

  if (targetIso === 'CA') {
    if (normPhone.startsWith('+91') || (digitsOnly.length === 12 && digitsOnly.startsWith('91'))) {
      throw {
        statusCode: 400,
        code: 'PHONE_COUNTRY_MISMATCH',
        message: 'Canadian drivers cannot register with an Indian phone number (+91)',
      };
    }
  }

  if (targetIso === 'IN') {
    if (normPhone.startsWith('+1') || (digitsOnly.length === 11 && digitsOnly.startsWith('1'))) {
      throw {
        statusCode: 400,
        code: 'PHONE_COUNTRY_MISMATCH',
        message: 'Indian drivers cannot register with a Canadian phone number (+1)',
      };
    }
  }

  if (!isDialMatch) {
    throw {
      statusCode: 400,
      code: 'PHONE_COUNTRY_MISMATCH',
      message: `Drivers in ${country.name} must register with a valid ${country.name} phone number (${country.dialCode})`,
    };
  }
}

function assertValidEmail(email) {
  if (!EMAIL_REGEX.test(email)) throw { statusCode: 400, code: 'EMAIL_INVALID', message: 'Enter a valid email address' };
}

// ── Rider OTP (unchanged) ──────────────────────────────────────────────────────

export async function sendOtp(phone, role = 'rider') {
  assertValidPhone(phone);
  await assertCanSendOtp(phone);

  const otp = generateOtp();
  await storeOtp(phone, otp);
  await sendOtpSms(phone, otp);
  await markOtpSent(phone);
  return { sent: true };
}

// regionCountry: ISO code from the caller's verified region token (rider-region.service.js);
// the rider's account country (and currency) is pinned to it — the phone was already checked
// to match. place: { cityId, stateId } where they were verified — becomes the home city/state
// of a new rider, and fills them in for an existing rider who has none yet.
export async function verifyRiderOtp(phone, otp, app, regionCountry = null, place = null) {
  const valid = await verifyOtp(phone, otp);
  if (!valid) throw { statusCode: 400, message: 'Invalid or expired OTP' };

  let country = null;
  if (regionCountry) {
    [country] = await db.select().from(countries).where(eq(countries.isoCode, regionCountry)).limit(1);
  }

  let [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  const isNew = !user;

  if (!user) {
    [user] = await db.insert(users).values({
      phone,
      isVerified: true,
      countryId: country?.id ?? null,
      currencyCode: country?.currencyCode ?? null,
      stateId: place?.stateId ?? null,
      cityId: place?.cityId ?? null,
    }).returning();
  } else {
    // An account belongs to the country it signed up in — it can't be used (or moved) elsewhere.
    if (country && user.countryId && user.countryId !== country.id) {
      const { accountCountryMismatchMessage } = await import('./rider-region.service.js');
      const [home] = await db.select({ iso: countries.isoCode }).from(countries).where(eq(countries.id, user.countryId)).limit(1);
      throw {
        statusCode: 403,
        code: 'ACCOUNT_COUNTRY_MISMATCH',
        message: accountCountryMismatchMessage(home?.iso?.toUpperCase(), country.isoCode.toUpperCase()),
      };
    }
    const patch = { isVerified: true };
    if (country && !user.countryId) Object.assign(patch, { countryId: country.id });
    if (country && !user.currencyCode) patch.currencyCode = country.currencyCode;
    if (place?.cityId && !user.cityId) {
      patch.cityId = place.cityId;
      patch.stateId = place.stateId;
    }
    [user] = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  }

  // `country` is the account's home country — the region middleware rejects requests made
  // from anywhere else (middleware/authenticate.js).
  const accessToken = app.jwt.sign({ id: user.id, role: 'rider', phone, country: country?.isoCode ?? null });
  const refreshToken = app.jwt.sign(
    { id: user.id, role: 'rider' },
    { secret: env.JWT_REFRESH_SECRET, expiresIn: env.JWT_REFRESH_EXPIRES_IN },
  );
  await redis.setex(REDIS_KEYS.refreshToken(user.id), 30 * 86400, refreshToken);

  return {
    accessToken, refreshToken, isNew, user,
    country: country
      ? { id: country.id, name: country.name, isoCode: country.isoCode, dialCode: country.dialCode, currencyCode: country.currencyCode }
      : null,
  };
}

// ── Driver mobile auth (device-scoped) ─────────────────────────────────────────

export async function driverMobileStart(phone, deviceId, countryCodeOrId = null) {
  assertValidPhone(phone);
  if (!deviceId) throw { statusCode: 400, message: 'deviceId is required' };

  if (countryCodeOrId) {
    await validateDriverPhoneCountryMatch(phone, countryCodeOrId);
  }

  await assertCanSendOtp(phone);

  const existing = await findDriverByPhone(phone);

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
  const accessToken = app.jwt.sign({ id: driver.id, role: 'driver', phone: driver.phone });
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

  let driver = await findDriverByPhone(phone);
  const isNew = !driver;

  if (!driver) {
    [driver] = await db.insert(drivers).values({
      phone: normalizePhone(phone), registrationStatus: 'mobile_verified', registrationStep: 1,
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

  let driver = await findDriverByPhone(phone);
  const isNew = !driver;

  if (!driver) {
    [driver] = await db.insert(drivers).values({
      phone: normalizePhone(phone),
      registrationStatus: 'mobile_verified',
      registrationStep: 1,
    }).returning();
  }

  if (driver.isBlocked) throw { statusCode: 403, code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended' };

  const accessToken = app.jwt.sign({ id: driver.id, role: 'driver', phone: driver.phone });
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

  const claims = { id: payload.id, role: payload.role };
  if (payload.role === 'driver') {
    const [driver] = await db.select({ isBlocked: drivers.isBlocked, phone: drivers.phone })
      .from(drivers).where(eq(drivers.id, payload.id)).limit(1);
    if (!driver || driver.isBlocked) throw { statusCode: 403, code: 'ACCOUNT_SUSPENDED', message: 'This account is suspended' };
    if (deviceId) {
      const [device] = await db.select({ isRevoked: driverDevices.isRevoked }).from(driverDevices)
        .where(and(eq(driverDevices.driverId, payload.id), eq(driverDevices.deviceId, deviceId))).limit(1);
      if (device?.isRevoked) throw { statusCode: 401, message: 'Refresh token revoked' };
    }
    if (driver.phone) claims.phone = driver.phone;
  }
  if (payload.role === 'rider') {
    const [rider] = await db.select({ phone: users.phone, country: countries.isoCode })
      .from(users).leftJoin(countries, eq(users.countryId, countries.id))
      .where(eq(users.id, payload.id)).limit(1);
    // read by the rider region check (middleware/authenticate.js)
    if (rider?.phone) claims.phone = rider.phone;
    if (rider?.country) claims.country = rider.country;
  }
  const accessToken = app.jwt.sign(claims);
  return { accessToken };
}

export async function logout(userId, deviceId) {
  await redis.del(REDIS_KEYS.refreshToken(userId, deviceId));
}

// ── Admin auth (bcrypt) ───────────────────────────────────────────────────────

const ADMIN_MAX_FAILED_LOGINS = 5;
const ADMIN_LOCKOUT_SECONDS = 900;
// Compared against when the email doesn't exist, so response time doesn't reveal valid emails.
const DUMMY_BCRYPT_HASH = bcrypt.hashSync('not-a-real-password', 10);

export async function adminLogin(email, password, app) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const failKey = `admin:login:fail:${normalizedEmail}`;
  const failures = parseInt((await redis.get(failKey)) || '0', 10);
  if (failures >= ADMIN_MAX_FAILED_LOGINS) {
    throw { statusCode: 429, code: 'LOGIN_LOCKED', message: 'Too many failed attempts. Try again in 15 minutes.' };
  }

  const [admin] = await db.select().from(admins).where(sql`lower(${admins.email}) = ${normalizedEmail}`).limit(1);
  const valid = await bcrypt.compare(password, admin?.password || DUMMY_BCRYPT_HASH);
  if (!admin || !valid) {
    await redis.multi().incr(failKey).expire(failKey, ADMIN_LOCKOUT_SECONDS).exec();
    throw { statusCode: 401, message: 'Invalid credentials' };
  }
  if (!admin.isActive) throw { statusCode: 403, message: 'Account disabled' };
  await redis.del(failKey);

  await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));

  const accessToken = app.jwt.sign({ id: admin.id, role: admin.role, email: admin.email });
  return {
    accessToken,
    admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
  };
}
