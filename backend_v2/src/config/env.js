// Secrets and credentials come ONLY from the environment (.env locally, the host's secret
// store in production) — never add a literal fallback here: this file is committed to git.
// Non-secret defaults point at the local docker-compose services. assertRequiredEnv() (run at
// server start) refuses to boot without the secrets the app can't safely run without.
export const env = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'production',
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database Configuration
  DB_HOST: process.env.DB_HOST || undefined,
  DB_PORT: process.env.DB_PORT || '5432',
  DB_NAME: process.env.DB_NAME || undefined,
  DB_USER: process.env.DB_USER || undefined,
  DB_PASSWORD: process.env.DB_PASSWORD || undefined,
  DB_SSL: process.env.DB_SSL || 'false',

  // Redis & Kafka Configuration (defaults = local docker-compose)
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:9092',
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'rideshare-api',
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'rideshare-group',

  // JWT Configuration — the two secrets must differ, or a refresh token verifies as an
  // access token (see assertRequiredEnv).
  JWT_SECRET: process.env.JWT_SECRET || undefined,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || undefined,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Integrations & API Keys — unset means the integration runs in its dev/mock mode
  // (see the is*Configured flags below).
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || undefined,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || undefined,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || undefined,
  // 'off' disables the rider India/Canada region lock (GPS + IP + phone-country checks) —
  // for simulators/emulators whose default location is outside both countries. Never in prod.
  RIDER_REGION_ENFORCEMENT: process.env.RIDER_REGION_ENFORCEMENT || 'off', // testing mode: the app sends no region token
  GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY || undefined,
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || undefined,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || undefined,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
  RAZORPAYX_ACCOUNT_NUMBER: process.env.RAZORPAYX_ACCOUNT_NUMBER || undefined,
  BANK_DETAILS_ENC_KEY: process.env.BANK_DETAILS_ENC_KEY || undefined,
  SMTP_HOST: process.env.SMTP_HOST || undefined,
  SMTP_PORT: process.env.SMTP_PORT || undefined,
  SMTP_USER: process.env.SMTP_USER || undefined,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || undefined,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || undefined,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
  STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET || undefined,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || undefined,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || undefined,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || undefined,
  S3_ENDPOINT: process.env.S3_ENDPOINT || undefined,
  S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || undefined,
  S3_SECRET_KEY: process.env.S3_SECRET_KEY || undefined,
  S3_BUCKET: process.env.S3_BUCKET || undefined,
  S3_PUBLIC_URL: process.env.S3_PUBLIC_URL || undefined,
  APP_BASE_URL: process.env.APP_BASE_URL || undefined,
  DRIVER_APP_ONBOARDING_RETURN_URL: process.env.DRIVER_APP_ONBOARDING_RETURN_URL || undefined,
  DRIVER_APP_ONBOARDING_REFRESH_URL: process.env.DRIVER_APP_ONBOARDING_REFRESH_URL || undefined,

  // Comma-separated browser origins allowed by CORS and Socket.IO (e.g. the admin portal).
  // Unset outside production = allow all; unset in production = allow none.
  CORS_ORIGINS: process.env.CORS_ORIGINS || undefined,
  DB_POOL_MAX: process.env.DB_POOL_MAX || '20',
  DB_SSL_CA: process.env.DB_SSL_CA || undefined, // PEM contents of the provider's CA bundle
  // Bearer token required for GET /metrics in production (unset = /metrics disabled there).
  METRICS_TOKEN: process.env.METRICS_TOKEN || undefined,
  ENABLE_API_DOCS: process.env.ENABLE_API_DOCS || undefined,

  // ── Development-only switches — assertRequiredEnv() refuses all of these in production ──
  // Socket test UIs, /socket-test/quick-auth token minting, the public / and /test namespaces.
  ENABLE_DEV_TOOLS: process.env.ENABLE_DEV_TOOLS || undefined,
  // Credits rides/top-ups/subscriptions without a real charge when a gateway has no keys.
  PAYMENTS_DEV_BYPASS: process.env.PAYMENTS_DEV_BYPASS || undefined,
  // Fixed OTP (e.g. 123456) for emulator testing when no SMS provider is configured.
  OTP_DEV_CODE: process.env.OTP_DEV_CODE || undefined,
  // Local-disk stand-in for S3 (modules/dev-storage). On by default outside production only.
  ALLOW_LOCAL_STORAGE: process.env.ALLOW_LOCAL_STORAGE || undefined,
};

export const isProduction = env.NODE_ENV === 'production';
const flag = (v) => String(v || '').toLowerCase() === 'true';

export const devToolsEnabled = !isProduction && flag(env.ENABLE_DEV_TOOLS);
export const paymentDevBypassEnabled = !isProduction && flag(env.PAYMENTS_DEV_BYPASS);
export const otpDevCode = !isProduction && /^\d{4,8}$/.test(env.OTP_DEV_CODE || '') ? env.OTP_DEV_CODE : null;
export const apiDocsEnabled = !isProduction || flag(env.ENABLE_API_DOCS);
export const corsOrigins = (env.CORS_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);

// Each of these flips a dependency service from its local/dummy dev fallback to the
// real integration the moment its keys are present — no other flag to flip.
export const isS3Configured = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET);
// Production must use S3; ALLOW_LOCAL_STORAGE=true is only for a deliberate single-server setup.
export const localStorageEnabled = !isS3Configured
  && (!isProduction || flag(env.ALLOW_LOCAL_STORAGE))
  && String(env.ALLOW_LOCAL_STORAGE || '').toLowerCase() !== 'false';
export const isTwilioConfigured = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER);
export const isRazorpayConfigured = !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
export const isRazorpayXConfigured = !!(isRazorpayConfigured && (env.RAZORPAYX_ACCOUNT_NUMBER || env.NODE_ENV === 'development'));
export const isSmtpConfigured = !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD && env.EMAIL_FROM);
export const isStripeConfigured = !!(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY);
export const isFirebaseConfigured = !!(
  env.FIREBASE_PROJECT_ID &&
  env.FIREBASE_PROJECT_ID !== 'your_project_id' &&
  env.FIREBASE_PRIVATE_KEY &&
  env.FIREBASE_PRIVATE_KEY !== 'your_private_key' &&
  env.FIREBASE_CLIENT_EMAIL &&
  env.FIREBASE_CLIENT_EMAIL !== 'your_client_email'
);

/**
 * Fails fast at server start instead of running with missing or unsafe secrets. Not run on
 * import, so unit tests can load modules without a full environment.
 */
export function assertRequiredEnv() {
  const isProd = env.NODE_ENV === 'production';
  const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'JWT_SECRET', 'JWT_REFRESH_SECRET']
    .filter((k) => !env[k]);
  if (isProd) {
    for (const k of ['DB_PASSWORD', 'BANK_DETAILS_ENC_KEY']) if (!env[k]) missing.push(k);
  }
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')} (see .env.example)`);
  }

  const problems = [];
  if (env.JWT_SECRET === env.JWT_REFRESH_SECRET) {
    problems.push('JWT_SECRET and JWT_REFRESH_SECRET are identical — refresh tokens would be accepted as access tokens');
  }
  if (env.JWT_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
    problems.push('JWT secrets must be at least 32 characters');
  }
  if (env.BANK_DETAILS_ENC_KEY && /^0123456789abcdef/i.test(env.BANK_DETAILS_ENC_KEY)) {
    problems.push('BANK_DETAILS_ENC_KEY is the documented placeholder');
  }
  if (isProd && String(env.RIDER_REGION_ENFORCEMENT).toLowerCase() === 'off') {
    // Allowed while testing: rider country then comes from the phone number (+91 India, +1
    // Canada) and is still enforced at booking/payment — only the GPS/IP lock is off.
    console.warn('[env] RIDER_REGION_ENFORCEMENT=off — riders are not location-checked (phone-number country only).');
  }
  if (isProd) {
    for (const k of ['ENABLE_DEV_TOOLS', 'PAYMENTS_DEV_BYPASS']) {
      if (flag(env[k])) problems.push(`${k}=true is not allowed in production`);
    }
    if (env.OTP_DEV_CODE) problems.push('OTP_DEV_CODE must not be set in production');
    if (!isTwilioConfigured) problems.push('Twilio is not configured — OTP SMS cannot be delivered');
    if (isRazorpayConfigured && !env.RAZORPAY_WEBHOOK_SECRET) {
      problems.push('RAZORPAY_WEBHOOK_SECRET is required when Razorpay keys are set');
    }
    if (isStripeConfigured && !env.STRIPE_WEBHOOK_SECRET) {
      problems.push('STRIPE_WEBHOOK_SECRET is required when Stripe keys are set');
    }
    if (!corsOrigins.length) problems.push('CORS_ORIGINS is empty — browsers (admin portal) will be refused');
  }
  if (env.BANK_DETAILS_ENC_KEY && Buffer.from(env.BANK_DETAILS_ENC_KEY, 'base64').length !== 32) {
    problems.push('BANK_DETAILS_ENC_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)');
  }
  if (problems.length) {
    const msg = `Unsafe configuration:\n  - ${problems.join('\n  - ')}`;
    if (isProd) throw new Error(msg);
    console.warn(`[env] ${msg}\n  (allowed outside production — fix before deploying)`);
  }
}

