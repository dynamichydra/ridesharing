import { eq, asc } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { rides, tripGpsPings, flaggedTrips } from '../../../drizzle/schema/index.js';
import { decodePolyline, computeCumulativeTripDistance } from '../../utils/maps.js';
import { roundToIncrement } from '../../utils/money.js';
import { flushRidePings, markRideGpsInactive } from './gps-ping.service.js';
import { shouldFlagDeviation } from './deviation-policy.js';
import { metrics } from '../../utils/metrics.js';

/**
 * Pure recompute — no DB access. Reuses the SAME rate numbers and the SAME
 * resolved zone/surge multipliers that were stamped into the ride's
 * fareSnapshot.breakdown at request time (not the vehicle type's current live
 * rate), so a disputed trip's fare is reconstructed exactly as it was actually
 * charged, not re-priced against whatever the rate has since been edited to.
 * The effective tax rate is likewise re-derived from the ORIGINAL estimate's
 * own numbers rather than re-querying tax rules, for the same audit-consistency
 * reason — this codebase doesn't version tax_rules.
 */
export function recomputeActualFare({ pricing, breakdown, estimatedFareMinor, actualDistanceKm, actualDurationMin, roundingIncrementMinor }) {
  const baseFareMinor = pricing.baseRateMinor;
  const distanceFareMinor = Math.round(actualDistanceKm * pricing.perKmRateMinor);
  const timeFareMinor = Math.round(actualDurationMin * pricing.perMinRateMinor);
  const subtotalMinor = baseFareMinor + distanceFareMinor + timeFareMinor;

  const zoneMultiplier = breakdown.zoneMultiplier ?? 1;
  const surgeMultiplier = breakdown.surgeMultiplier ?? 1;
  const flatFareMinor = breakdown.flatFareMinor ?? null;

  const totalBeforeMinMinor = flatFareMinor != null
    ? flatFareMinor
    : Math.round(subtotalMinor * zoneMultiplier * surgeMultiplier);
  const preTaxFareMinor = Math.max(totalBeforeMinMinor, pricing.minFareMinor ?? 0);

  const originalPreTaxMinor = estimatedFareMinor - (breakdown.taxMinor ?? 0);
  const effectiveTaxRate = originalPreTaxMinor > 0 ? (breakdown.taxMinor ?? 0) / originalPreTaxMinor : 0;
  const taxMinor = Math.round(preTaxFareMinor * effectiveTaxRate);

  const actualFareMinor = roundToIncrement(preTaxFareMinor + taxMinor, roundingIncrementMinor);

  return { actualFareMinor, baseFareMinor, distanceFareMinor, timeFareMinor, taxMinor };
}

/**
 * Fire-and-forget, triggered from ride.service.completeRide() after the fast
 * synchronous response has already gone out to the rider — this recomputes the
 * bill from real GPS-derived distance/time instead of the upfront estimate.
 */
export async function finalizeTripDistance(rideId) {
  await flushRidePings(rideId); // catch anything buffered since the last periodic flush
  await markRideGpsInactive(rideId);

  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId)).limit(1);
  if (!ride) return;

  const pings = await db.select().from(tripGpsPings)
    .where(eq(tripGpsPings.rideId, rideId)).orderBy(asc(tripGpsPings.recordedAt));

  const gpsPingCount = pings.length;
  const gpsNoiseRejectedCount = pings.filter((p) => p.isNoise).length;

  if (gpsPingCount === 0) {
    // No GPS trace at all (e.g. mobile client not yet sending accuracy/speed/
    // recordedAt — see README's launch-decisions list) — nothing to reconcile
    // against; leave the estimate-based finalFareMinor from completeRide() as-is.
    console.warn(`[FinalizeTrip] Ride ${rideId}: no GPS pings recorded, skipping reconciliation`);
    return;
  }

  const decodedPath = ride.polyline ? decodePolyline(ride.polyline) : [];
  const { actualDistanceKm } = computeCumulativeTripDistance(
    pings.map((p) => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng), isNoise: p.isNoise, gapFlag: p.gapFlag })),
    decodedPath,
    parseFloat(ride.distanceKm ?? 0),
  );
  const actualDurationMin = ride.durationMin; // wall-clock, already set by completeRide()

  await db.update(rides).set({
    actualDistanceKm: String(actualDistanceKm),
    actualDurationMin,
    gpsPingCount,
    gpsNoiseRejectedCount,
  }).where(eq(rides.id, rideId));

  const breakdown = ride.fareSnapshot?.breakdown ?? {};
  const pricing = breakdown.rate;
  if (!pricing) return; // pre-existing ride from before this feature — nothing stamped to recompute against

  const { actualFareMinor } = recomputeActualFare({
    pricing, breakdown,
    estimatedFareMinor: ride.estimatedFareMinor,
    actualDistanceKm, actualDurationMin,
    roundingIncrementMinor: 1, // country rounding isn't re-fetched here — matches the stamped snapshot's own precision
  });

  const { deviationPct, flagged } = shouldFlagDeviation(ride.estimatedFareMinor, actualFareMinor);

  if (flagged) {
    metrics.fareDeviationFlaggedTotal.inc();
    await db.insert(flaggedTrips).values({
      rideId,
      reason: 'fare_deviation',
      estimatedFareMinor: ride.estimatedFareMinor,
      actualFareMinor,
      deviationPct: String(deviationPct),
      status: 'pending_review',
    });
    console.warn(`[FinalizeTrip] Ride ${rideId} flagged: actual ${actualFareMinor} vs estimate ${ride.estimatedFareMinor} (${deviationPct}%)`);
    // finalFareMinor intentionally left at the original safe estimate — not auto-billed.
  } else {
    await db.update(rides).set({ finalFareMinor: actualFareMinor }).where(eq(rides.id, rideId));
  }
}
