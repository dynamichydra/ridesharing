import { eq, and, gt } from 'drizzle-orm';
import { db } from '../../../config/db.js';
import { fareQuotes } from '../../../../drizzle/schema/index.js';
import { FareEngine } from '../engine/fare.engine.js';
import { moment } from '../../../utils/time.js';
import { isLocationInServiceArea } from '../../zone/zone.service.js';
import crypto from 'crypto';

const QUOTE_VALIDITY_MINUTES = 10;

/**
 * Generates an immutable, locked fare quote snapshot and stores it in fare_quotes table.
 */
export async function createFareQuote(request) {
  if (request.pickupLat != null && request.pickupLng != null) {
    const pickupCheck = await isLocationInServiceArea(request.pickupLat, request.pickupLng);
    if (!pickupCheck.inServiceArea) {
      throw { statusCode: 400, code: pickupCheck.reason, message: pickupCheck.message };
    }
  }

  const fareResult = await FareEngine.calculate({ ...request, skipCache: true });
  const expiresAt = moment().add(QUOTE_VALIDITY_MINUTES, 'minutes').toDate();
  const quoteId = `FQ-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  const [quote] = await db.insert(fareQuotes).values({
    quoteId,
    userId: request.userId || null,
    cityId: fareResult.cityId || null,
    pickupZoneId: fareResult.pickupZoneId || null,
    destinationZoneId: fareResult.destinationZoneId || null,
    pickupAirportId: fareResult.pickupAirportId || null,
    destinationAirportId: fareResult.destinationAirportId || null,
    vehicleTypeId: request.vehicleTypeId,
    pickupLatitude: String(request.pickupLat),
    pickupLongitude: String(request.pickupLng),
    destinationLatitude: String(request.dropLat),
    destinationLongitude: String(request.dropLng),
    estimatedDistanceMeters: Math.round((fareResult.distanceKm || 0) * 1000),
    estimatedDurationSeconds: Math.round((fareResult.durationMin || 0) * 60),
    distanceSource: 'google',
    pricingPlanId: fareResult.pricingPlanId || null,
    pricingPlanVersionId: fareResult.pricingPlanVersionId || null,
    currencyCode: fareResult.currencyCode || 'INR',

    baseFare: fareResult.baseFareMinor || 0,
    distanceFare: fareResult.distanceFareMinor || 0,
    timeFare: fareResult.timeFareMinor || 0,
    waitingFare: fareResult.waitingFareMinor || 0,
    nightSurcharge: fareResult.nightSurchargeMinor || 0,
    peakSurcharge: fareResult.peakSurchargeMinor || 0,
    surgeAmount: fareResult.surgeAmountMinor || 0,
    surgeMultiplier: String(fareResult.surgeMultiplier || 1.0),
    airportFee: fareResult.airportFeeMinor || 0,
    tollAmount: fareResult.tollAmountMinor || 0,
    bookingFee: fareResult.bookingFeeMinor || 0,
    platformFee: fareResult.platformFeeMinor || 0,
    discountAmount: fareResult.discountAmountMinor || 0,
    taxAmount: fareResult.taxAmountMinor || 0,
    subtotal: fareResult.subtotalMinor || fareResult.originalEstimatedFareMinor,
    total: fareResult.totalMinor || fareResult.estimatedFareMinor,

    couponCode: request.promoCode || null,
    calculationMetadata: fareResult.breakdown || {},
    status: 'active',
    expiresAt,
  }).returning();

  return {
    quoteId: quote.quoteId,
    id: quote.id,
    expiresAt: quote.expiresAt,
    validForSeconds: QUOTE_VALIDITY_MINUTES * 60,
    ...fareResult,
  };
}

/**
 * Validates a quote ID and ensures it has not expired or already been consumed.
 */
export async function validateAndLockQuote(quoteIdOrUuid, userId) {
  const [quote] = await db.select().from(fareQuotes)
    .where(and(
      eq(fareQuotes.id, quoteIdOrUuid),
      eq(fareQuotes.status, 'active'),
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

  if (quote.userId && userId && quote.userId !== userId) {
    throw {
      statusCode: 403,
      code: 'QUOTE_UNAUTHORIZED',
      message: 'This fare quote belongs to a different user session',
    };
  }

  // Mark quote as used
  await db.update(fareQuotes)
    .set({ status: 'used' })
    .where(eq(fareQuotes.id, quote.id));

  // Return normalized structure for ride creation
  return {
    ...quote,
    riderId: quote.userId,
    distanceKm: (quote.estimatedDistanceMeters / 1000).toFixed(2),
    durationMin: Math.round(quote.estimatedDurationSeconds / 60),
    durationInTrafficMin: Math.round(quote.estimatedDurationSeconds / 60),
    finalFareMinor: quote.total,
    estimatedFareMinor: quote.total,
    breakdown: quote.calculationMetadata,
    appliedFareRuleIds: quote.calculationMetadata?.rules?.appliedRules?.map((r) => r.id) || [],
  };
}

export async function getQuoteById(id) {
  const [quote] = await db.select().from(fareQuotes).where(eq(fareQuotes.id, id)).limit(1);
  if (!quote) throw { statusCode: 404, message: 'Quote not found' };
  return quote;
}
