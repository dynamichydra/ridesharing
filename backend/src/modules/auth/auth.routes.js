import { sendSuccess, sendError } from '../../utils/response.js';
import * as authService from './auth.service.js';

export async function authRoutes(app) {

  // POST /api/v1/auth/rider/send-otp
  app.post('/rider/send-otp', async (request, reply) => {
    const { phone } = request.body;
    if (!phone) return sendError(reply, 'Phone is required');
    await authService.sendOtp(phone);
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
    await authService.sendOtp(phone);
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
    await authService.logout(request.user.id);
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
