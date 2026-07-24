import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_VERSION: z.string().default('v1'),
  DB_HOST: z.string(),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_SSL: z.string().default('false'), // 'true' for managed/cloud Postgres (Aiven, RDS, etc.)
  REDIS_URL: z.string(),
  KAFKA_BROKERS: z.string(),
  KAFKA_CLIENT_ID: z.string().default('rideshare-api'),
  KAFKA_GROUP_ID: z.string().default('rideshare-group'),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  GOOGLE_MAPS_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAYX_ACCOUNT_NUMBER: z.string().optional(), // RazorpayX current account that driver payouts are drawn from
  BANK_DETAILS_ENC_KEY: z.string().optional(),      // base64, 32 bytes — see utils/encryption.js
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_CONNECT_WEBHOOK_SECRET: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_URL: z.string().optional(),
  APP_BASE_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Each of these flips a dependency service from its local/dummy dev fallback to the
// real integration the moment its keys are present in .env — no other flag to flip.
export const isS3Configured = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET);
export const isTwilioConfigured = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER);
export const isRazorpayConfigured = !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
// Payouts draw from a separate RazorpayX current account — standard Razorpay keys alone
// (used for orders/payments) aren't enough to call the Contacts/Fund Accounts/Payouts APIs.
export const isRazorpayXConfigured = !!(isRazorpayConfigured && env.RAZORPAYX_ACCOUNT_NUMBER);
export const isStripeConfigured = !!(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY);
