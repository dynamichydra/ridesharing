import { sendSuccess, sendList, parsePagination } from '../../utils/response.js';
import { authenticateAdmin } from '../../middleware/authenticate.js';
import * as adminService from './admin.service.js';
import { listHistoryPaginated } from '../ride/ride_status_history.service.js';

export async function adminRoutes(app) {

  // All admin routes require admin JWT
  app.addHook('preHandler', authenticateAdmin);

  // GET /api/v1/admin/dashboard — Main KPI metrics, fleet status counters, health telemetry
  app.get('/dashboard', async (request, reply) => {
    const data = await adminService.getDashboardStats();
    return sendSuccess(reply, data);
  });

  // GET /api/v1/admin/dashboard/dispatch-queue — Live unassigned / searching ride requests
  app.get('/dashboard/dispatch-queue', async (request, reply) => {
    const limit = parseInt(request.query.limit || '10', 10);
    const data = await adminService.getDispatchQueue(limit);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/admin/dashboard/alerts — High priority alerts (SOS/Flagged trips) + live event stream
  app.get('/dashboard/alerts', async (request, reply) => {
    const data = await adminService.getLiveMonitoringAlerts();
    return sendSuccess(reply, data);
  });

  // GET /api/v1/admin/dashboard/supply-demand — Zone equilibrium and supply/demand gaps
  app.get('/dashboard/supply-demand', async (request, reply) => {
    const data = await adminService.getSupplyDemandAnalytics();
    return sendSuccess(reply, data);
  });

  // GET /api/v1/admin/dashboard/earnings — Daily / Weekly / Monthly revenue breakdown
  app.get('/dashboard/earnings', async (request, reply) => {
    const timeframe = request.query.timeframe || 'week';
    const currencyCode = request.query.currencyCode || request.query.currency;
    const data = await adminService.getEarningsTrend(timeframe, currencyCode);
    return sendSuccess(reply, data);
  });

  // GET /api/v1/admin/dashboard/recent-activity — Real-time live trips activity
  app.get('/dashboard/recent-activity', async (request, reply) => {
    const limit = parseInt(request.query.limit || '10', 10);
    const data = await adminService.getRecentActivity(limit);
    return sendSuccess(reply, data);
  });

  app.get('/stats/rides', async (request, reply) => {
    const days = parseInt(request.query.days || '30', 10);
    const data = await adminService.getRideStats(days);
    return sendSuccess(reply, data);
  });

  app.get('/stats/subscriptions', async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = {
      countryId: request.query.countryId,
      planType: request.query.planType || request.query.type,
      currencyCode: request.query.currencyCode,
      isActive: request.query.isActive !== undefined ? request.query.isActive === 'true' : undefined,
      search: request.query.search || request.query.planName,
    };
    const sort = {
      sortBy: request.query.sortBy,
      sortOrder: request.query.sortOrder || request.query.order,
    };
    const { rows, pagination } = await adminService.getSubscriptionStats({ page, limit, offset, filters, sort });
    return sendList(reply, rows, pagination);
  });

  app.get('/audit-logs', async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query);
    const filters = { actorType: request.query.actorType, action: request.query.action };
    const { rows, pagination } = await adminService.listAuditLogs(page, limit, offset, filters);
    return sendList(reply, rows, pagination);
  });

  // GET /api/v1/admin/ride-history?rideId=... — global status-change log across all rides
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