import { redis, REDIS_KEYS } from '../config/redis.js';
import { env } from '../config/env.js';

const CODE_TTL_SECONDS       = 600;  // 10 minutes
const RESEND_COOLDOWN_SECONDS = 30;
const MAX_SENDS_PER_HOUR    = 5;
const MAX_VERIFY_ATTEMPTS   = 5;
const LOCKOUT_SECONDS       = 900;

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function assertCanSendCode(email) {
  const locked = await redis.get(REDIS_KEYS.otpLock(email));
  if (locked) throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many attempts. Try again later.' };

  const cooldown = await redis.ttl(REDIS_KEYS.otpResendCooldown(email));
  if (cooldown > 0) {
    throw { statusCode: 429, code: 'OTP_RESEND_TOO_SOON', message: `Please wait ${cooldown}s before requesting another code.`, resendAfterSeconds: cooldown };
  }

  const sendCount = parseInt((await redis.get(REDIS_KEYS.otpSendCount(email))) || '0', 10);
  if (sendCount >= MAX_SENDS_PER_HOUR) {
    throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many code requests. Try again in an hour.' };
  }
}

async function sendEmailCode(email, code) {
  // No transactional email provider wired up yet — log in dev, no-op otherwise.
  // Swap this for SES/SendGrid/Postmark when a provider is chosen.
  if (env.NODE_ENV !== 'production') {
    console.log(`📧 Verification code for ${email}: ${code}`);
    return;
  }
  console.warn(`Email provider not configured — could not send code to ${email}`);
}

export async function sendEmailVerification(email) {
  await assertCanSendCode(email);
  const code = generateCode();
  await redis.setex(REDIS_KEYS.emailCode(email), CODE_TTL_SECONDS, code);
  await sendEmailCode(email, code);
  await redis.setex(REDIS_KEYS.otpResendCooldown(email), RESEND_COOLDOWN_SECONDS, '1');
  await redis.multi()
    .incr(REDIS_KEYS.otpSendCount(email))
    .expire(REDIS_KEYS.otpSendCount(email), 3600)
    .exec();
  return { sent: true, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

export async function verifyEmailCode(email, code) {
  const locked = await redis.get(REDIS_KEYS.otpLock(email));
  if (locked) throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many attempts. Try again later.' };

  const stored = await redis.get(REDIS_KEYS.emailCode(email));
  if (!stored || stored !== code) {
    const attempts = await redis.incr(REDIS_KEYS.otpAttempts(email));
    await redis.expire(REDIS_KEYS.otpAttempts(email), LOCKOUT_SECONDS);
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await redis.setex(REDIS_KEYS.otpLock(email), LOCKOUT_SECONDS, '1');
      throw { statusCode: 429, code: 'OTP_MAX_ATTEMPTS', message: 'Too many wrong attempts. Try again in 15 minutes.' };
    }
    return false;
  }

  await redis.del(REDIS_KEYS.emailCode(email), REDIS_KEYS.otpAttempts(email));
  return true;
}
