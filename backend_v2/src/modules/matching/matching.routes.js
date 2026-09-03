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

export async function matchingRoutes(fastify, options) {
  // ── Driver Offer Endpoints ───────────────────────────────────────────────────
  fastify.post('/offers/:offerId/accept', { preHandler: [fastify.authenticate] }, handleAcceptOffer);
  fastify.post('/offers/:offerId/reject', { preHandler: [fastify.authenticate] }, handleRejectOffer);
  fastify.get('/driver/active-offer', { preHandler: [fastify.authenticate] }, handleGetActiveOffer);

  // ── Airport Queue Endpoints ───────────────────────────────────────────────────
  fastify.post('/airport/join', { preHandler: [fastify.authenticate] }, handleJoinAirportQueue);
  fastify.post('/airport/leave', { preHandler: [fastify.authenticate] }, handleLeaveAirportQueue);
  fastify.get('/airport/status', handleGetAirportQueueStatus);

  // ── Admin Observability & Debugger Endpoints ───────────────────────────────────
  fastify.get('/admin/debugger/:rideId', { preHandler: [fastify.authenticate] }, handleGetMatchingDebugger);
  fastify.get('/admin/active-jobs', { preHandler: [fastify.authenticate] }, handleGetActiveDispatchJobs);
  fastify.get('/admin/supply-demand', { preHandler: [fastify.authenticate] }, handleGetSupplyDemand);
  fastify.get('/admin/policies', { preHandler: [fastify.authenticate] }, handleListPolicies);
  fastify.put('/admin/policies', { preHandler: [fastify.authenticate] }, handleUpsertPolicy);
  fastify.delete('/admin/policies/:id', { preHandler: [fastify.authenticate] }, handleDeletePolicy);
  fastify.post('/admin/reconcile', { preHandler: [fastify.authenticate] }, handleTriggerReconciliation);
}
