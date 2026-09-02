import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { fareQuotes } from '../../../../drizzle/schema/index.js';
import { FareEngine } from '../engine/fare.engine.js';
import { moment } from '../../../utils/time.js';

const QUOTE_VALIDITY_MINUTES = 10;

/**
 * Generates an immutable, locked fare quote snapshot and stores it in fare_quotes table.
 */
export async function createFareQuote(request) {
  const fareResult = await FareEngine.calculate({ ...request, skipCache: true });

  const expiresAt = moment().add(QUOTE_VALIDITY_MINUTES, 'minutes').toDate();

  const [quote] = await db.insert(fareQuotes).values({
    riderId: request.userId || null,
    vehicleTypeId: request.vehicleTypeId,
    pricingVersionId: fareResult.pricingVersionId || null,
    pickupLat: String(request.pickupLat),
    pickupLng: String(request.pickupLng),
    dropLat: String(request.dropLat),
    dropLng: String(request.dropLng),
    distanceKm: String(fareResult.distanceKm),
    durationMin: fareResult.durationMin,
    durationInTrafficMin: fareResult.durationInTrafficMin,
    surgeMultiplier: String(fareResult.breakdown.surge.surgeMultiplier || 1.0),
    estimatedFareMinor: fareResult.originalEstimatedFareMinor,
    discountAmountMinor: fareResult.discountAmountMinor || 0,
    finalFareMinor: fareResult.estimatedFareMinor,
    currencyCode: fareResult.currencyCode,
    polyline: fareResult.polyline,
    breakdown: fareResult.breakdown,
    appliedFareRuleIds: fareResult.appliedFareRuleIds,
    status: 'QUOTED',
    expiresAt,
  }).returning();

  return {
    quoteId: quote.id,
    expiresAt: quote.expiresAt,
    validForSeconds: QUOTE_VALIDITY_MINUTES * 60,
    ...fareResult,
  };
}

/**
 * Validates a quote ID and ensures it has not expired or already been consumed.
 */
export async function validateAndLockQuote(quoteId, riderId) {
  const [quote] = await db.select().from(fareQuotes)
    .where(and(
      eq(fareQuotes.id, quoteId),
      eq(fareQuotes.status, 'QUOTED'),
      gt(fareQuotes.expiresAt, new Date())
    ))
    .limit(1);

  if (!quote) {
    throw {
      statusCode: 400,
      code: 'QUOTE_EXPIRED_OR_INVALID',
      message: 'Fare quote is invalid or has expired. Please request a new estimate.',
    };
  }

  if (quote.riderId && riderId && quote.riderId !== riderId) {
    throw {
      statusCode: 403,
      code: 'QUOTE_UNAUTHORIZED',
      message: 'This fare quote belongs to a different user session',
    };
  }

  // Mark quote as BOOKED
  await db.update(fareQuotes)
    .set({ status: 'BOOKED', updatedAt: new Date() })
    .where(eq(fareQuotes.id, quoteId));

  return quote;
}

export async function getQuoteById(quoteId) {
  const [quote] = await db.select().from(fareQuotes).where(eq(fareQuotes.id, quoteId)).limit(1);
  if (!quote) throw { statusCode: 404, message: 'Quote not found' };
  return quote;
}
