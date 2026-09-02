import { sendSuccess, sendError } from '../../utils/response.js';
import {
  authenticateRider,
  authenticateDriver,
  authenticateAdmin,
  authenticateAny,
} from '../../middleware/authenticate.js';
import * as riderService from '../rider/rider.service.js';
import * as driverService from '../driver/driver.service.js';
import * as adminService from '../admin/admin.service.js';

export async function userRoutes(app) {

  // GET /api/v1/users/rider/me — Dedicated Rider profile & telemetry
  app.get('/rider/me', { preHandler: [authenticateRider] }, async (request, reply) => {
    const data = await riderService.getRiderMe(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/users/driver/me — Dedicated Driver profile & telemetry
  app.get('/driver/me', { preHandler: [authenticateDriver] }, async (request, reply) => {
    const data = await driverService.getDriverMe(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/users/admin/me — Dedicated Admin profile & permissions
  app.get('/admin/me', { preHandler: [authenticateAdmin] }, async (request, reply) => {
    const data = await adminService.getAdminMe(request.user.id);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/users/me — Role-agnostic current user profile
  app.get('/me', { preHandler: [authenticateAny] }, async (request, reply) => {
    const role = request.user?.role;
    const userId = request.user?.id;

    if (role === 'rider') {
      const data = await riderService.getRiderMe(userId);
      return sendSuccess(reply, data);
    }

    if (role === 'driver') {
      const data = await driverService.getDriverMe(userId);
      return sendSuccess(reply, data);
    }

    if (['admin', 'super_admin'].includes(role)) {
      const data = await adminService.getAdminMe(userId);
      return sendSuccess(reply, data);
    }

    return sendError(reply, 'Invalid or unrecognized user role', 400);
  });
}
