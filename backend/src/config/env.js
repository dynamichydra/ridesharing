// Secrets come only from the environment — never add a literal fallback here (committed to git).
export const env = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database Configuration
  DB_HOST: process.env.DB_HOST || undefined,
  DB_PORT: process.env.DB_PORT || '5432',
  DB_NAME: process.env.DB_NAME || undefined,
  DB_USER: process.env.DB_USER || undefined,
  DB_PASSWORD: process.env.DB_PASSWORD || undefined,
  DB_SSL: process.env.DB_SSL || 'false',

  // Redis & Kafka Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  KAFKA_BROKERS: process.env.KAFKA_BROKERS || 'localhost:9092',
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'rideshare-api',
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'rideshare-group',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || undefined,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || undefined,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Integrations & API Keys
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || undefined,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || undefined,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || undefined,
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
};

// Each of these flips a dependency service from its local/dummy dev fallback to the
// real integration the moment its keys are present — no other flag to flip.
export const isS3Configured = !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY && env.S3_SECRET_KEY && env.S3_BUCKET);
export const isTwilioConfigured = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER);
export const isRazorpayConfigured = !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
export const isRazorpayXConfigured = !!(isRazorpayConfigured && (env.RAZORPAYX_ACCOUNT_NUMBER || env.NODE_ENV === 'development'));
export const isSmtpConfigured = !!(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASSWORD && env.EMAIL_FROM);
export const isStripeConfigured = !!(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY);

