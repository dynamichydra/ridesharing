import { db } from '../../config/db.js';
import { rideOffers, dispatchJobs, rides, airportQueues, airportQueueEntries } from '../../../drizzle/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { assignDriverToRide } from './assignment.service.js';
import { rejectOffer, getDriverOffers } from '../ride/ride_offer.service.js';
import { joinAirportQueue, leaveAirportQueue, getAirportQueueStatus } from './airport-queue.service.js';
import { listMatchingPolicies, upsertMatchingPolicy } from './matching-policy.service.js';
import { getZoneSupplyDemand } from './supply-demand.service.js';
import { runMatchingReconciliation } from './matching-reconciliation.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

/**
 * Matching Controller
 */

// ── Driver Offer Actions ────────────────────────────────────────────────────────

export async function handleAcceptOffer(request, reply) {
  const driverId = request.user.id;
  const { offerId } = request.params;

  // 1. Verify offer existence and ownership
  const [offer] = await db
    .select()
    .from(rideOffers)
    .where(and(eq(rideOffers.id, offerId), eq(rideOffers.driverId, driverId)))
    .limit(1);

  if (!offer) {
    return sendError(reply, 'Offer not found or does not belong to you', 404);
  }

  if (offer.status !== 'pending') {
    return sendError(reply, `Offer is already ${offer.status}`, 409);
  }

  // 2. Perform atomic assignment
  try {
    const result = await assignDriverToRide(offer.rideId, driverId, {
      assignmentType: 'automatic',
      dispatchJobId: offer.dispatchJobId,
      reason: 'Driver accepted offer',
    });

    return sendSuccess(reply, result, 200);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    return sendError(reply, err.message || 'Failed to accept offer', statusCode);
  }
}

export async function handleRejectOffer(request, reply) {
  const driverId = request.user.id;
  const { offerId } = request.params;
  const { reason = 'TOO_FAR' } = request.body || {};

  const [offer] = await db
    .select()
    .from(rideOffers)
    .where(and(eq(rideOffers.id, offerId), eq(rideOffers.driverId, driverId)))
    .limit(1);

  if (!offer) {
    return sendError(reply, 'Offer not found', 404);
  }

  const rejected = await rejectOffer(offer.rideId, driverId, reason);
  return sendSuccess(reply, rejected);
}

export async function handleGetActiveOffer(request, reply) {
  const driverId = request.user.id;

  const [activeOffer] = await db
    .select({
      id: rideOffers.id,
      rideId: rideOffers.rideId,
      status: rideOffers.status,
      wave: rideOffers.wave,
      ring: rideOffers.ring,
      distanceKm: rideOffers.distanceKm,
      etaSeconds: rideOffers.etaSeconds,
      offeredAt: rideOffers.offeredAt,
      expiresAt: rideOffers.expiresAt,
    })
    .from(rideOffers)
    .where(and(eq(rideOffers.driverId, driverId), eq(rideOffers.status, 'pending')))
    .orderBy(desc(rideOffers.offeredAt))
    .limit(1);

  if (!activeOffer) {
    return sendSuccess(reply, null);
  }

  // Enrich with basic ride pickup details
  const [ride] = await db
    .select({
      pickupAddress: rides.pickupAddress,
      dropAddress: rides.dropAddress,
      estimatedFareMinor: rides.estimatedFareMinor,
      currencyCode: rides.currencyCode,
    })
    .from(rides)
    .where(eq(rides.id, activeOffer.rideId))
    .limit(1);

  return sendSuccess(reply, {
    ...activeOffer,
    ride: ride || null,
  });
}

// ── Airport Queue Actions ───────────────────────────────────────────────────────

export async function handleJoinAirportQueue(request, reply) {
  const driverId = request.user.id;
  const { zoneId, vehicleTypeId } = request.body || {};

  if (!zoneId) {
    return sendError(reply, 'zoneId is required', 400);
  }

  const entry = await joinAirportQueue({ driverId, zoneId, vehicleTypeId });
  if (!entry) {
    return sendError(reply, 'Airport queue not found for zone', 404);
  }

  return sendSuccess(reply, entry, 201);
}

export async function handleLeaveAirportQueue(request, reply) {
  const driverId = request.user.id;
  const { queueId } = request.body || {};

  const left = await leaveAirportQueue(driverId, queueId);
  return sendSuccess(reply, left);
}

export async function handleGetAirportQueueStatus(request, reply) {
  const { zoneId } = request.query || {};
  if (!zoneId) {
    return sendError(reply, 'zoneId query param required', 400);
  }

  const status = await getAirportQueueStatus(zoneId);
  return sendSuccess(reply, status);
}

// ── Admin Observability & Debugger ──────────────────────────────────────────────

export async function handleGetMatchingDebugger(request, reply) {
  const { rideId } = request.params;

  const [job] = await db
    .select()
    .from(dispatchJobs)
    .where(eq(dispatchJobs.rideId, rideId))
    .orderBy(desc(dispatchJobs.startedAt))
    .limit(1);

  const offers = await db
    .select()
    .from(rideOffers)
    .where(eq(rideOffers.rideId, rideId))
    .orderBy(desc(rideOffers.offeredAt));

  return sendSuccess(reply, {
    dispatchJob: job || null,
    offers,
    explainableFunnel: job?.explainableData || null,
  });
}

export async function handleGetActiveDispatchJobs(request, reply) {
  const jobs = await db
    .select()
    .from(dispatchJobs)
    .where(eq(dispatchJobs.status, 'searching'))
    .orderBy(desc(dispatchJobs.startedAt))
    .limit(50);

  return sendSuccess(reply, jobs);
}

export async function handleGetSupplyDemand(request, reply) {
  const { zoneId } = request.query || {};
  if (!zoneId) {
    return sendError(reply, 'zoneId query param required', 400);
  }

  const metrics = await getZoneSupplyDemand(zoneId);
  return sendSuccess(reply, metrics);
}

export async function handleListPolicies(request, reply) {
  const policies = await listMatchingPolicies();
  return sendSuccess(reply, policies);
}

export async function handleUpsertPolicy(request, reply) {
  const policy = await upsertMatchingPolicy(request.body);
  return sendSuccess(reply, policy);
}

export async function handleTriggerReconciliation(request, reply) {
  const report = await runMatchingReconciliation();
  return sendSuccess(reply, report);
}
