import { sendSuccess, sendError } from '../../utils/response.js';
import { authenticateDriver } from '../../middleware/authenticate.js';
import * as authService from './auth.service.js';

export async function authRoutes(app) {

  // ── Driver — mobile (device-scoped) ─────────────────────────────────────────

  // POST /api/v1/auth/driver/mobile/start
  app.post('/driver/mobile/start', async (request, reply) => {
    const { phone, deviceId, countryCode, countryId } = request.body || {};
    if (!phone || !deviceId) return sendError(reply, 'phone and deviceId are required');
    const data = await authService.driverMobileStart(phone, deviceId, countryCode || countryId);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/mobile/resend
  app.post('/driver/mobile/resend', async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return sendError(reply, 'phone is required');
    const data = await authService.driverMobileResend(phone);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/mobile/verify
  app.post('/driver/mobile/verify', async (request, reply) => {
    const { phone, otp, deviceId, platform, fcmToken } = request.body;
    if (!phone || !otp || !deviceId) return sendError(reply, 'phone, otp and deviceId are required');
    const data = await authService.driverMobileVerify(phone, otp, deviceId, platform, fcmToken, request.ip, app);
    return sendSuccess(reply, data);
  });

  // ── Driver — email (device-scoped) ──────────────────────────────────────────

  // POST /api/v1/auth/driver/email/start
  app.post('/driver/email/start', async (request, reply) => {
    const { email } = request.body;
    if (!email) return sendError(reply, 'email is required');
    const data = await authService.driverEmailStart(email);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/email/verify
  app.post('/driver/email/verify', async (request, reply) => {
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

  // POST /api/v1/auth/rider/send-otp
  app.post('/rider/send-otp', async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return sendError(reply, 'Phone is required');
    await authService.sendOtp(phone, 'rider');
    return sendSuccess(reply, 'OTP sent successfully');
  });

  // POST /api/v1/auth/rider/verify-otp
  app.post('/rider/verify-otp', async (request, reply) => {
    const { phone, otp } = request.body;
    if (!phone || !otp) return sendError(reply, 'Phone and OTP are required');
    const data = await authService.verifyRiderOtp(phone, otp, app);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/driver/send-otp
  app.post('/driver/send-otp', async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return sendError(reply, 'Phone is required');
    await authService.sendOtp(phone, 'driver');
    return sendSuccess(reply, 'OTP sent successfully');
  });

  // POST /api/v1/auth/driver/verify-otp
  app.post('/driver/verify-otp', async (request, reply) => {
    const { phone, otp } = request.body;
    if (!phone || !otp) return sendError(reply, 'Phone and OTP are required');
    const data = await authService.verifyDriverOtp(phone, otp, app);
    return sendSuccess(reply, data);
  });

  // POST /api/v1/auth/refresh
  app.post('/refresh', async (request, reply) => {
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
  app.post('/admin/login', async (request, reply) => {
    const { email, password } = request.body;
    if (!email || !password) return sendError(reply, 'Email and password are required');
    const data = await authService.adminLogin(email, password, app);
    return sendSuccess(reply, data);
  });
}
