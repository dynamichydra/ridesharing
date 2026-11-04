import {
  handleAcceptOffer,
  handleRejectOffer,
  handleGetActiveOffer,
  handleJoinAirportQueue,
  handleLeaveAirportQueue,
  handleGetAirportQueueStatus,
  handleGetMatchingDebugger,
  handleGetActiveDispatchJobs,
  handleGetSupplyDemand,
  handleListPolicies,
  handleUpsertPolicy,
  handleDeletePolicy,
  handleTriggerReconciliation,
} from './matching.controller.js';

import { authenticateDriver, authenticateAdmin, authenticateSuperAdmin } from '../../middleware/authenticate.js';

export async function matchingRoutes(fastify, options) {
  // ── Driver Offer Endpoints ───────────────────────────────────────────────────
  fastify.post('/offers/:offerId/accept', { preHandler: [authenticateDriver] }, handleAcceptOffer);
  fastify.post('/offers/:offerId/reject', { preHandler: [authenticateDriver] }, handleRejectOffer);
  fastify.get('/driver/active-offer', { preHandler: [authenticateDriver] }, handleGetActiveOffer);

  // ── Airport Queue Endpoints ───────────────────────────────────────────────────
  fastify.post('/airport/join', { preHandler: [authenticateDriver] }, handleJoinAirportQueue);
  fastify.post('/airport/leave', { preHandler: [authenticateDriver] }, handleLeaveAirportQueue);
  fastify.get('/airport/status', handleGetAirportQueueStatus);

  // ── Admin Observability & Debugger Endpoints ───────────────────────────────────
  fastify.get('/admin/debugger/:rideId', { preHandler: [authenticateAdmin] }, handleGetMatchingDebugger);
  fastify.get('/admin/active-jobs', { preHandler: [authenticateAdmin] }, handleGetActiveDispatchJobs);
  fastify.get('/admin/supply-demand', { preHandler: [authenticateAdmin] }, handleGetSupplyDemand);
  fastify.get('/admin/policies', { preHandler: [authenticateAdmin] }, handleListPolicies);
  fastify.put('/admin/policies', { preHandler: [authenticateSuperAdmin] }, handleUpsertPolicy);
  fastify.delete('/admin/policies/:id', { preHandler: [authenticateSuperAdmin] }, handleDeletePolicy);
  fastify.post('/admin/reconcile', { preHandler: [authenticateSuperAdmin] }, handleTriggerReconciliation);
}
