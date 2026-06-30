import { redis, REDIS_KEYS } from '../config/redis.js';
import { env } from '../config/env.js';

const OTP_TTL_SECONDS = 300; // 5 minutes

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function storeOtp(phone, otp) {
  await redis.setex(REDIS_KEYS.otpCode(phone), OTP_TTL_SECONDS, otp);
}

export async function verifyOtp(phone, otp) {
  const stored = await redis.get(REDIS_KEYS.otpCode(phone));
  if (!stored || stored !== otp) return false;
  await redis.del(REDIS_KEYS.otpCode(phone));
  return true;
}

export async function sendOtpSms(phone, otp) {
  // In dev mode — just log it
  if (env.NODE_ENV !== 'production' || !env.TWILIO_ACCOUNT_SID) {
    console.log(`📱 OTP for ${phone}: ${otp}`);
    return;
  }
  const { default: twilio } = await import('twilio');
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body: `Your RideShare OTP is: ${otp}. Valid for 5 minutes.`,
    from: env.TWILIO_PHONE_NUMBER,
    to:   phone,
  });
}
