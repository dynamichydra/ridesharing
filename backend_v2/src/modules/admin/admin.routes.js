import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as adminService from './admin.service.js';
import { listHistoryPaginated } from '../ride/ride_status_history.service.js';

export async function adminRoutes(app) {

  // All admin routes require admin JWT
  app.addHook('preHandler', authenticateAdmin);

  app.get('/dashboard', async (request, reply) => {
    const data = await adminService.getDashboardStats();
    return sendSuccess(reply, data);
  });

  app.get('/stats/rides', async (request, reply) => {
    const days = parseInt(request.query.days || '30', 10);
    const data = await adminService.getRideStats(days);
    return sendSuccess(reply, data);
  });

  app.get('/stats/subscriptions', async (request, reply) => {
    const data = await adminService.getSubscriptionStats();
    return sendSuccess(reply, data);
  });

  app.get('/audit-logs', async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { actorType: request.query.actorType, action: request.query.action };
    const { rows, pagination } = await adminService.listAuditLogs(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/admin/ride-history?rideId=...  — global status-change log across all rides
  app.get('/ride-history', async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { rideId: request.query.rideId };
    const { rows, pagination } = await listHistoryPaginated(filters, page, limit, offset);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/admin/analytics/supply-demand-heatmap
  app.get('/analytics/supply-demand-heatmap', async (request, reply) => {
    const data = await adminService.getSupplyDemandHeatmap();
    return sendSuccess(reply, data);
  });

}