// Falls back to localhost for local dev — set VITE_API_BASE_URL in .env (or .env.production,
// .env.staging via `vite build --mode staging`) to point a built portal at a real backend.
// See .env.example. Normalized to always end in "/" since URL_SUFIX below is concatenated
// directly onto it with no separator.
const RAW_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "rideshareapi.dokume.in";
// const API_BASE_URL = RAW_API_BASE_URL.endsWith('/') ? RAW_API_BASE_URL : `${RAW_API_BASE_URL}/`;
const API_BASE_URL = `https://rideshareapi.dokume.in/`;
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
  MODE: 'test',
  PLATFORM_NAME: 'RideShare Admin',
  PLATFORM_TEMPLATE: 1,
  VERSION: '1.0.0',
  PRIVATE_KEY: 'rideshare-admin-secret-key',
  PAGESIZE: 10,
}
export default DM_CORE_CONFIG;
