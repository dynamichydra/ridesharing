import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateDriver } from '../../middleware/authenticate.js';
import * as authService from './auth.service.js';
import {
  checkRiderRegion,
  issueRegionToken,
  verifyRegionToken,
  assertPhoneMatchesRegion,
  isRegionEnforcementEnabled,
  riderPhoneCountry,
  countryFromCoordinates,
  resolveServiceCity,
  regionPlaceFromToken,
  RIDER_COUNTRIES,
  RegionError,
} from './rider-region.service.js';

function sendRegionError(reply, err) {
  return reply.status(err.statusCode || 403).send({ SUCCESS: false, MESSAGE: err.message, CODE: err.code });
}

// Rider OTP calls must carry the region token from /rider/region-check; returns its country.
function riderRegionFromRequest(app, request) {
  if (!isRegionEnforcementEnabled()) {
    return riderPhoneCountry(request.body?.phone) || 'IN';
  }
  return verifyRegionToken(app, request.body?.regionToken || request.headers['x-region-token'], request.ip);
}

// Per-IP limits on top of the per-phone/email OTP caps (utils/otp.js) — stops SMS pumping across
// many numbers and password guessing across many admin emails.
const perIpLimit = (max) => ({ config: { rateLimit: { max, timeWindow: '1 minute' } } });

export async function authRoutes(app) {

  // ── Driver — mobile (device-scoped) ─────────────────────────────────────────

  // POST /api/v1/auth/driver/mobile/start
  app.post('/driver/mobile/start', perIpLimit(5), async (request, reply) => {
    const { phone, deviceId, countryCode, countryId } = request.body || {};
    if (!phone || !deviceId) return sendError(reply, 'phone and deviceId are required');
    const data = await authService.driverMobileStart(phone, deviceId, countryCode || countryId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/mobile/resend
  app.post('/driver/mobile/resend', perIpLimit(5), async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return sendError(reply, 'phone is required');
    const data = await authService.driverMobileResend(phone);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/mobile/verify
  app.post('/driver/mobile/verify', perIpLimit(10), async (request, reply) => {
    const { phone, otp, deviceId, platform, fcmToken } = request.body;
    if (!phone || !otp || !deviceId) return sendError(reply, 'phone, otp and deviceId are required');
    const data = await authService.driverMobileVerify(phone, otp, deviceId, platform, fcmToken, request.ip, app);
    return sendSuccess(reply, data);
  });

  // ── Driver — email (device-scoped) ──────────────────────────────────────────

  // POST /api/v1/auth/driver/email/start
  app.post('/driver/email/start', perIpLimit(5), async (request, reply) => {
    const { email } = request.body;
    if (!email) return sendError(reply, 'email is required');
    const data = await authService.driverEmailStart(email);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/email/verify
  app.post('/driver/email/verify', perIpLimit(10), async (request, reply) => {
    const { email, code, deviceId, platform, fcmToken } = request.body;
    if (!email || !code || !deviceId) return sendError(reply, 'email, code and deviceId are required');
    const data = await authService.driverEmailVerify(email, code, deviceId, platform, fcmToken, request.ip, app);
    return sendSuccess(reply, data);
  });

  // ── Driver — device/session management ──────────────────────────────────────

  // GET /api/v1/auth/devices
  app.get('/devices', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await authService.listDriverDevices(request.user.id);
    return sendSuccess(reply, data);
  });

  // DELETE /api/v1/auth/devices/:deviceId
  app.delete('/devices/:deviceId', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await authService.revokeDriverDevice(request.user.id, request.params.deviceId);
    return sendSuccess(reply, data);
  });

  // ── Rider — region lock (India / Canada only) ───────────────────────────────

  // POST /api/v1/auth/rider/region-check
  // { lat, lng, accuracyM, fixAgeMs, isMocked, isVpn } → { countryCode, countryName, dialCode, regionToken }
  // Called by the rider app on every launch/resume and before login. The country comes from
  // the server's own reverse geocode + IP check, never from the client.
  app.post('/rider/region-check', perIpLimit(30), async (request, reply) => {
    try {
      const body = request.body || {};
      let region;
      if (isRegionEnforcementEnabled()) {
        region = await checkRiderRegion({ ...body, ip: request.ip });
      } else {
        // Dev bypass: still pick a supported country so the phone rules apply.
        let iso = null;
        let place = null;
        const hasFix = Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng));
        try {
          if (hasFix) iso = await countryFromCoordinates(Number(body.lat), Number(body.lng));
        } catch { /* ignore in dev */ }
        iso = RIDER_COUNTRIES.includes(iso) ? iso : 'IN';
        if (hasFix) place = await resolveServiceCity(Number(body.lat), Number(body.lng));
        region = {
          allowed: true,
          countryCode: iso,
          countryName: iso === 'IN' ? 'India' : 'Canada',
          dialCode: iso === 'IN' ? '+91' : '+1',
          cityId: place?.cityId ?? null,
          cityName: place?.cityName ?? null,
          stateId: place?.stateId ?? null,
        };
      }
      const regionToken = issueRegionToken(app, region, request.ip);
      return sendSuccess(reply, { ...region, regionToken, expiresInSeconds: 30 * 60 });
    } catch (err) {
      if (err instanceof RegionError) return sendRegionError(reply, err);
      throw err;
    }
  });

  // POST /api/v1/auth/rider/send-otp  { phone, regionToken }
  app.post('/rider/send-otp', perIpLimit(5), async (request, reply) => {
    const { phone } = request.body || {};
    if (!phone) return sendError(reply, 'Phone is required');
    try {
      const regionCountry = riderRegionFromRequest(app, request);
      assertPhoneMatchesRegion(phone, regionCountry);
    } catch (err) {
      if (err instanceof RegionError) return sendRegionError(reply, err);
      throw err;
    }
    await authService.sendOtp(phone, 'rider');
    return sendSuccess(reply, 'OTP sent successfully');
  });

  // POST /api/v1/auth/rider/verify-otp  { phone, otp, regionToken }
  app.post('/rider/verify-otp', perIpLimit(10), async (request, reply) => {
    const { phone, otp } = request.body || {};
    if (!phone || !otp) return sendError(reply, 'Phone and OTP are required');
    let regionCountry;
    try {
      regionCountry = riderRegionFromRequest(app, request);
      assertPhoneMatchesRegion(phone, regionCountry);
    } catch (err) {
      if (err instanceof RegionError) return sendRegionError(reply, err);
      throw err;
    }
    const place = regionPlaceFromToken(app, request.body?.regionToken || request.headers['x-region-token'], regionCountry);
    const data = await authService.verifyRiderOtp(phone, otp, app, regionCountry, place);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/send-otp
  app.post('/driver/send-otp', perIpLimit(5), async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return sendError(reply, 'Phone is required');
    await authService.sendOtp(phone, 'driver');
    return sendSuccess(reply, 'OTP sent successfully');
  });

  // POST /api/v1/auth/driver/verify-otp
  app.post('/driver/verify-otp', perIpLimit(10), async (request, reply) => {
    const { phone, otp } = request.body;
    if (!phone || !otp) return sendError(reply, 'Phone and OTP are required');
    const data = await authService.verifyDriverOtp(phone, otp, app);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', perIpLimit(30), async (request, reply) => {
    const { refreshToken } = request.body;
    if (!refreshToken) return sendError(reply, 'Refresh token required');
    const data = await authService.refreshTokens(refreshToken, app);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/logout
  app.post('/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    await authService.logout(request.user.id, request.body?.deviceId);
    return sendSuccess(reply, 'Logged out successfully');
  });

  // POST /api/v1/auth/admin/login
  app.post('/admin/login', perIpLimit(10), async (request, reply) => {
    const { email, password } = request.body;
    if (!email || !password) return sendError(reply, 'Email and password are required');
    const data = await authService.adminLogin(email, password, app);
    return sendSuccess(reply, data);
  });
}
