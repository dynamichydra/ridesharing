import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { fareQuotes } from '../../../../drizzle/schema/index.js';
import { FareEngine } from '../engine/fare.engine.js';
import { moment } from '../../../utils/time.js';
import { isLocationInServiceArea } from '../../zone/zone.service.js';

const QUOTE_VALIDITY_MINUTES = 10;

/**
 * Generates an immutable, locked fare quote snapshot and stores it in fare_quotes table.
 */
export async function createFareQuote(request) {
  if (request.pickupLat != null && request.pickupLng != null) {
    const pickupCheck = await isLocationInServiceArea(request.pickupLat, request.pickupLng);
    if (!pickupCheck.inServiceArea) {
      throw { statusCode: 400, code: pickupCheck.reason, message: `Pickup location error: ${pickupCheck.message}` };
    }
  }

  if (request.dropLat != null && request.dropLng != null) {
    const dropCheck = await isLocationInServiceArea(request.dropLat, request.dropLng);
    if (!dropCheck.inServiceArea) {
      throw { statusCode: 400, code: dropCheck.reason === 'OUT_OF_SERVICE_AREA' ? 'DROP_OUT_OF_SERVICE_AREA' : dropCheck.reason, message: `Drop-off location error: ${dropCheck.message}` };
    }
  }

  const fareResult = await FareEngine.calculate({ ...request, skipCache: true });

  const expiresAt = moment().add(QUOTE_VALIDITY_MINUTES, 'minutes').toDate();

  const [quote] = await db.insert(fareQuotes).values({
    riderId: request.userId || null,
    vehicleTypeId: request.vehicleTypeId,
    cityTypeId: fareResult.breakdown?.cityTypeId || null,
    cityTypeFareId: fareResult.breakdown?.cityTypeFareId || null,
    pickupLat: String(request.pickupLat),
    pickupLng: String(request.pickupLng),
    dropLat: String(request.dropLat),
    dropLng: String(request.dropLng),
    distanceKm: String(fareResult.distanceKm),
    durationMin: fareResult.durationMin,
    durationInTrafficMin: fareResult.durationInTrafficMin,
    surgeMultiplier: String(fareResult.breakdown.surge?.surgeMultiplier || 1.0),
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
    )).limit(1);

  if (!quote) {
    throw { statusCode: 400, code: 'INVALID_OR_EXPIRED_QUOTE', message: 'Fare quote is invalid, expired, or already used' };
  }

  if (quote.riderId && riderId && quote.riderId !== riderId) {
    throw { statusCode: 403, code: 'QUOTE_FORBIDDEN', message: 'This fare quote belongs to a different rider' };
  }

  const [locked] = await db.update(fareQuotes)
    .set({ status: 'BOOKED', updatedAt: new Date() })
    .where(eq(fareQuotes.id, quoteId))
    .returning();

  return locked;
}

export async function getQuoteById(quoteId) {
  const [quote] = await db.select().from(fareQuotes)
    .where(eq(fareQuotes.id, quoteId)).limit(1);

  if (!quote) {
    throw { statusCode: 404, message: 'Fare quote not found' };
  }

  return quote;
}

export const getFareQuoteById = getQuoteById;

