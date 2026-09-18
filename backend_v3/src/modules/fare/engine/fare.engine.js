import { redis, REDIS_KEYS } from '../../../config/redis.js';
import { executeServiceAreaStage } from './stages/01-service-area.stage.js';
import { executeZoneResolverStage } from './stages/02-zone-resolver.stage.js';
import { executeRoutingStage } from './stages/03-routing.stage.js';
import { executePricingCardStage } from './stages/04-pricing-card.stage.js';
import { executeMeteredFareStage } from './stages/05-metered-fare.stage.js';
import { executeFareRulesStage } from './stages/06-rules.stage.js';
import { executeSurgeStage } from './stages/07-surge.stage.js';
import { executeFeesStage } from './stages/08-fees.stage.js';
import { executeTaxesStage } from './stages/09-taxes.stage.js';
import { executePromoStage } from './stages/10-promo.stage.js';
import { executeRoundingStage } from './stages/11-rounding.stage.js';

/**
 * Versioned, rule-driven Fare Engine Pipeline.
 */
export class FareEngine {
  /**
   * Calculates a complete fare calculation and breakdown from a request.
   *
   * @param {Object} request
   * @param {number|string} request.pickupLat
   * @param {number|string} request.pickupLng
   * @param {number|string} request.dropLat
   * @param {number|string} request.dropLng
   * @param {string} request.vehicleTypeId
   * @param {string} [request.promoCode]
   * @param {string} [request.userId]
   * @param {boolean} [request.skipCache=false]
   * @returns {Promise<Object>} Final structured fare estimate
   */
  static async calculate(request) {
    const { pickupLat, pickupLng, dropLat, dropLng, vehicleTypeId, promoCode = null, userId = null, skipCache = false } = request;

    // 1. Cache Check (~100m precision)
    const cacheKey = REDIS_KEYS.fareCache(
      `${vehicleTypeId}:${(+pickupLat).toFixed(3)},${(+pickupLng).toFixed(3)}` +
      `:${(+dropLat).toFixed(3)},${(+dropLng).toFixed(3)}:${promoCode || ''}:${userId || ''}`,
    );

    if (!skipCache) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    // 2. Initialize Execution Context
    let context = {
      request: {
        pickupLat: parseFloat(pickupLat),
        pickupLng: parseFloat(pickupLng),
        dropLat: parseFloat(dropLat),
        dropLng: parseFloat(dropLng),
        vehicleTypeId,
        promoCode,
        userId,
      },
    };

    // 3. Execute Pipeline Stages Sequentially
    context = await executeServiceAreaStage(context);
    context = await executeZoneResolverStage(context);
    context = await executeRoutingStage(context);
    context = await executePricingCardStage(context);
    context = await executeMeteredFareStage(context);
    context = await executeFareRulesStage(context);
    context = await executeSurgeStage(context);
    context = await executeFeesStage(context);
    context = await executeTaxesStage(context);
    context = await executePromoStage(context);
    context = await executeRoundingStage(context);

    // 4. Cache calculated result (TTL: 120 seconds)
    await redis.setex(cacheKey, 120, JSON.stringify(context.result));

    return context.result;
  }
}
