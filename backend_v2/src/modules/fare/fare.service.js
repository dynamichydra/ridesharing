import { FareEngine } from './engine/fare.engine.js';
import { createFareQuote, getQuoteById, validateAndLockQuote } from './quotes/quote.service.js';
import { recalculateTripFare } from './quotes/recalculation.service.js';

/**
 * Main fare calculator façade.
 * Executes the versioned 11-stage FareEngine pipeline.
 * Returns full breakdown; snapshot is stored on the ride row at request time.
 */
export async function calculateFare(params) {
  return FareEngine.calculate(params);
}

/**
 * Estimates fare across all available vehicle types for the rider app map/selector.
 */
export async function estimateAllTypes({ pickupLat, pickupLng, dropLat, dropLng, activeVehicleTypes, promoCode = null, userId = null }) {
  return Promise.all(
    activeVehicleTypes.map((vt) =>
      calculateFare({
        pickupLat,
        pickupLng,
        dropLat,
        dropLng,
        vehicleTypeId: vt.id,
        promoCode,
        userId,
      }).catch((err) => {
        console.warn(`[FareEstimate] Skipped vehicle type ${vt.id}:`, err.message || err);
        return null;
      }),
    ),
  ).then((res) => res.filter(Boolean));
}

export {
  createFareQuote,
  getQuoteById,
  validateAndLockQuote,
  recalculateTripFare,
};

