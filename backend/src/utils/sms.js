import { env, isTwilioConfigured } from '../config/env.js';

let _client = null;
async function getClient() {
  if (_client) return _client;
  const { default: twilio } = await import('twilio');
  _client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  return _client;
}

// General-purpose SMS sender — extracted from otp.js's inline Twilio client construction so
// the notification dispatch pipeline (notification-dispatch.service.js) has a general-purpose
// "Message" (SMS) channel to call instead of just the OTP-specific one-off.
export async function sendSms(phone, body) {
  if (!isTwilioConfigured) {
    console.log(`[SMS DEV] → ${phone}: ${body}`);
    return;
  }
  const client = await getClient();
  await client.messages.create({ body, from: env.TWILIO_PHONE_NUMBER, to: phone });
}
