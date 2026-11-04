// Falls back to localhost for local dev — set VITE_API_BASE_URL in .env (or .env.production,
// .env.staging via `vite build --mode staging`) to point a built portal at a real backend.
// See .env.example. Normalized to always end in "/" since URL_SUFIX below is concatenated
// directly onto it with no separator.
const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const API_BASE_URL = RAW_API_BASE_URL.endsWith('/') ? RAW_API_BASE_URL : `${RAW_API_BASE_URL}/`;

const DM_CORE_CONFIG = {
  SERVER_URL: API_BASE_URL,
  BACKEND_URL: API_BASE_URL,
  URL_SUFIX: 'api/v1',
  APP_PLATFORM: 'private',
  AUTH_MODE: 'private',
  LANDING_URL: '/',
  AUTH_SUCCESS_URL: '/',
  LOGIN_CALLBACK: null,
  LOGOUT_CALLBACK: null,
  VERIFY_EMAIL: false,
  MODE: import.meta.env.MODE || 'production',
  PLATFORM_NAME: 'RideShare Admin',
  PLATFORM_TEMPLATE: 1,
  VERSION: '1.0.0',
  PAGESIZE: 10,
  // Publishable payment keys come from the build env (.env / .env.production) only. The backend
  // normally returns the key with each order, so these are just a fallback — never a hard-coded
  // test key, which would silently send a live portal to a sandbox account.
  STRIPE_PUBLISHABLE_KEY: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  RAZORPAY_KEY_ID: import.meta.env.VITE_RAZORPAY_KEY_ID || '',
};

export default DM_CORE_CONFIG;
