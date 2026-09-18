export const env = {
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'production',
  API_VERSION: process.env.API_VERSION || 'v1',

  // Database Configuration
  DB_HOST: process.env.DB_HOST || 'pg-eca863e-courier-app.j.aivencloud.com',
  DB_PORT: process.env.DB_PORT || '18641',
  DB_NAME: process.env.DB_NAME || 'defaultdb',
  DB_USER: process.env.DB_USER || 'avnadmin',
  DB_PASSWORD: process.env.DB_PASSWORD || 'AVNS_6vmELQHLWotgsatBTt8',
  DB_SSL: process.env.DB_SSL || 'true',

  // Redis & Kafka Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://193.203.163.97:6379',
  KAFKA_BROKERS: process.env.KAFKA_BROKERS || '193.203.163.97:9092',
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'rideshare-api',
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'rideshare-group',

  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'ce017f96b5713a0e37dec3c476883bae09a2e0bf422683a39e6876e663103f296c5209c0afec18e28074fe1dc598a0867173564e94111f30beb337da4add3e1d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'ce017f96b5713a0e37dec3c476883bae09a2e0bf422683a39e6876e663103f296c5209c0afec18e28074fe1dc598a0867173564e94111f30beb337da4add3e1d',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  // Integrations & API Keys
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || undefined,
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || undefined,
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || undefined,
  GOOGLE_MAPS_KEY: process.env.GOOGLE_MAPS_KEY || 'AIzaSyCa9c3EMWliRd2AUcZA-LpJF7VwhEjsd7g',
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || 'rzp_test_TJFQ9bAdEGvc8K',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '7izpBh3Ax4jfCqxFdWQfhexE',
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
  RAZORPAYX_ACCOUNT_NUMBER: process.env.RAZORPAYX_ACCOUNT_NUMBER || '233434343434',
  BANK_DETAILS_ENC_KEY: process.env.BANK_DETAILS_ENC_KEY || '0123456789abcdef0123456789abcdef',
  SMTP_HOST: process.env.SMTP_HOST || undefined,
  SMTP_PORT: process.env.SMTP_PORT || undefined,
  SMTP_USER: process.env.SMTP_USER || undefined,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'sk_test_51RbecsR1ylYVNeuXxpvAjesQJ0XMharciNLwKpqS45GdOxPYk401z8Qo6ONK5aRTSvCwrAQn2XeF6lvozkQjWQai00DpVJV1ZS',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51RbecsR1ylYVNeuXLVleTgOqCCYrBDFxv3qxOSUaGXNrESLbUuZgzmE7SKy63vPSgBEEeIJuFVFQNIFkPmIwe99X00LDoRXsSf',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || undefined,
  STRIPE_CONNECT_WEBHOOK_SECRET: process.env.STRIPE_CONNECT_WEBHOOK_SECRET || undefined,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || 'ryva-ride',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEugIBADANBgkqhkiG9w0BAQEFAASCBKQwggSgAgEAAoIBAQDTVOfL8f4NZNZb\nnhfTTZKSs94sMAlFjvAMwCV/ZVuzAodM6fnU8Q3wqBl55Ta+KoefEmPV5ieEms3V\nfs4k12kITLSCTIee8pgk4bwvP1qnG6UPxuxGfXwY7qfPtosIEryWd+s3oJ+DOQ4j\nFPylgN7d3YCQLTVWVUQOrCsvwSkJuYiHRXDWXO/suBk6OfqyuVHOVOEmey6shOk1\ntJlpG0BK9ysdmrJMeB0pihm30/TxQjvEIrfrHWabb8tgeHge8kQKTJjDfwPA5diT\nsZANc9rM4IWb8qDVKnUDXz1PevW2UlmCH2RM2KzgM6RLtrrJDNZ0ZVMj+lj5pvoz\nOPyWkh1BAgMBAAECgf9GKurLzI2N5O1HfjZq8la4XwBlq41oiw0pLqNEqWLJDQ3f\ne9B345G9VhMfZfvHKFffeTusyb5VSREO0gugL+Wv28gTe1WMcQATPuA8z8xJr+Qe\nWO4aeY+6t4MAdJu1EoOLckWnMq3D5C3NeCpqyV82S1VkiZ4sDCOMu52bPYdispyC\n77lWJbXiDJD6kTVIn3YvSUYl5FH5CioErkk4se24JWSz6Xy11YK3Cnpq+BMfB0Y+\n6IuEw4fs/kX5YJGap4imH+Yb6hK7Ov+Z7qyi6GVwaWiyegCcnTgSCeN1rEObnUq0\nR43ayIcQJ1jHUBX/Bm49qgQFLJtKVe/ACutRPWUCgYEA/zDJAiGcX0gFp0fy/888\nQayEWESuHEitNLOFRHr8i64xcXyzrXO71hh9sHshCFjNKBc61vqrbVrZxhKn8f3R\n17CecGsnNC2AGT6DkaWUVSoXivdUwsKN2r1F4g5y19fayOJ3/BGFSZW1Obgvvzzt\nqNzEWjd3wGeTuNXYSgqOhiMCgYEA1ACBvzOiTksRd+LQ9VBrwmfYMDunhT6eEbLX\nEvc2WQLyj+tG0si1lrsO10ppKI8ci1IAmmH2V41QJogXK9UpCw9qP7xLNwr0HTRC\nPvOsOUwFrAJTemsbmzlGqA8nEPnwVnDBvCg9J4StXru0kTRyONaXKhAUSN2LCuT4\nSA0Ke0sCgYA9pLQ5npLedVBgS0IIxy+gEaNaiySf0nJ8k4zysN7GgwqQhnYExTsv\niXT7J5MgKAtOzuW4vo6geNy4OxN0okKJXrG3KDstIHycHHy9twiw1d0gBYTlEwgf\nOa9i3uig+RRxiDtBmZ3f25kOW061XGtwafvIazOzN5H4iTeZExnAjwKBgDT6H3Ih\nPAjml2nnAyKaQyNkgdCjx5vzZtqzXy19G1ao9uZh++PGhiIxgmboUFjzUkW6ay4p\nFr8QMBxA29F3RfdelcVxjzYlBZWaroc+qyXySmSOfD/WLiLe8Dok9zU10Ao5yR/0\nyjtq20wWCexTN8veTA4V0IvY2NsTFrwijiD7AoGABj309HFOWQbCBvpLrREKvWue\nbC5spI4RkWONauFWYrtYpQPiNCU5Hl62USwC+dhWxjNo3fybExhPFaiMTo5557kc\nuMh0cATXXFFjm7lwi4HBz8Y9FsZUQoYGkxkZx0TGhNXAPEVvVYrhcnY6hb9CqW0+\notKa4OJsslAA0mYuRiU=\n-----END PRIVATE KEY-----\n',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@ryva-ride.iam.gserviceaccount.com',
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
export const isFirebaseConfigured = !!(
  env.FIREBASE_PROJECT_ID &&
  env.FIREBASE_PROJECT_ID !== 'your_project_id' &&
  env.FIREBASE_PRIVATE_KEY &&
  env.FIREBASE_PRIVATE_KEY !== 'your_private_key' &&
  env.FIREBASE_CLIENT_EMAIL &&
  env.FIREBASE_CLIENT_EMAIL !== 'your_client_email'
);

