import { redis, REDIS_KEYS } from '../config/redis.js';
import { sendSms } from './sms.js';

const OTP_TTL_SECONDS = 300;   // 5 minutes
const RESEND_COOLDOWN_SECONDS = 30;   // min gap between sends
const MAX_SENDS_PER_HOUR = 5;
const MAX_VERIFY_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900;   // 15 minutes

export function generateOtp() {
  // return String(Math.floor(100000 + Math.random() * 900000));
  return String(123456);
}

/** Throws if the phone is resend-cooling-down, hourly-capped, or locked out from too many wrong attempts. */
export async function assertCanSendOtp(phone) {
  const locked = await redis.get(REDIS_KEYS.otpLock(phone));
  if (locked) throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many attempts. Try again later.' };

  const cooldown = await redis.ttl(REDIS_KEYS.otpResendCooldown(phone));
  if (cooldown > 0) {
    throw { statusCode: 429, code: 'OTP_RESEND_TOO_SOON', message: `Please wait ${cooldown}s before requesting another code.`, resendAfterSeconds: cooldown };
  }

  const sendCount = parseInt((await redis.get(REDIS_KEYS.otpSendCount(phone))) || '0', 10);
  if (sendCount >= MAX_SENDS_PER_HOUR) {
    throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many OTP requests. Try again in an hour.' };
  }
}

export async function markOtpSent(phone) {
  await redis.setex(REDIS_KEYS.otpResendCooldown(phone), RESEND_COOLDOWN_SECONDS, '1');
  await redis.multi()
    .incr(REDIS_KEYS.otpSendCount(phone))
    .expire(REDIS_KEYS.otpSendCount(phone), 3600)
    .exec();
}

export async function storeOtp(phone, otp) {
  await redis.setex(REDIS_KEYS.otpCode(phone), OTP_TTL_SECONDS, otp);
}

/**
 * Verify OTP with attempt tracking. Returns true/false; throws OTP_MAX_ATTEMPTS once the
 * wrong-attempt count is exhausted (locks the phone out for LOCKOUT_SECONDS).
 */
export async function verifyOtp(phone, otp) {
  const locked = await redis.get(REDIS_KEYS.otpLock(phone));
  if (locked) throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many attempts. Try again later.' };

  const stored = await redis.get(REDIS_KEYS.otpCode(phone));
  if (!stored || stored !== otp) {
    const attempts = await redis.incr(REDIS_KEYS.otpAttempts(phone));
    await redis.expire(REDIS_KEYS.otpAttempts(phone), LOCKOUT_SECONDS);
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await redis.setex(REDIS_KEYS.otpLock(phone), LOCKOUT_SECONDS, '1');
      throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many wrong attempts. Try again in 15 minutes.' };
    }
    return false;
  }

  await redis.del(REDIS_KEYS.otpCode(phone), REDIS_KEYS.otpAttempts(phone));
  return true;
}

export async function sendOtpSms(phone, otp) {
  await sendSms(phone, `Your RideShare OTP is: ${otp}. Valid for 5 minutes.`);
}
