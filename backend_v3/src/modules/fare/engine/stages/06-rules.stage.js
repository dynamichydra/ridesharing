import { eq, and, or, isNull, lte, gte, desc } from 'drizzle-orm';
import { db } from '../../../../config/db.js';
import {
  fareRules,
  nightPricingRules,
  peakPricingRules,
  airportPricingRules,
  airports,
  tollRules,
} from '../../../../../drizzle/schema/index.js';
import { isTimeInRange } from '../../../../utils/time.js';

/**
 * Stage 6: Dynamic Rule Evaluation (Fare Rules, Night Rules, Peak Rules, Airport Rules, and Tolls).
 */
export async function executeFareRulesStage(context) {
  const { request, country, pickupZone, dropZone, hexZoneIds, route, pricingVersionId, rateCard } = context;
  const vehicleTypeId = request.vehicleTypeId;
  const now = new Date();
  const timezone = country?.timezone || 'UTC';

  let ruleMultiplier = 1.0;
  let flatFareMinor = null;
  let nightSurchargeMinor = 0;
  let peakSurchargeMinor = 0;
  let airportFeeMinor = 0;
  let tollAmountMinor = 0;
  const appliedRules = [];
  const appliedFareRuleIds = [];

  // ─── 1. Generic Fare Rules ───────────────────────────────────────────────
  const genericRules = await db.select().from(fareRules).where(
    and(
      eq(fareRules.isActive, true),
      or(eq(fareRules.vehicleTypeId, vehicleTypeId), isNull(fareRules.vehicleTypeId)),
      or(eq(fareRules.countryId, country.id), isNull(fareRules.countryId)),
    )
  ).orderBy(desc(fareRules.priority));

  for (const rule of genericRules) {
    let matches = false;

    if (rule.ruleType === 'time' && rule.startTime && rule.endTime) {
      matches = isTimeInRange(rule.startTime, rule.endTime, rule.daysOfWeek, timezone);
    } else if (rule.ruleType === 'traffic') {
      matches = route.trafficDelayS >= (rule.trafficDelayS ?? 300);
    } else if (rule.ruleType === 'zone' && rule.zoneId) {
      matches = pickupZone?.id === rule.zoneId || hexZoneIds.has(rule.zoneId);
    } else if (rule.ruleType === 'custom') {
      matches = true;
    }

    if (matches) {
      if (rule.allowedVehicleTypeIds?.length && !rule.allowedVehicleTypeIds.includes(vehicleTypeId)) {
        throw {
          statusCode: 422,
          message: `Vehicle type not permitted by zone rule "${rule.name}"`,
        };
      }

      const numVal = parseFloat(rule.value || rule.multiplier || '1.0');
      if (rule.flatFareMinor != null && flatFareMinor === null) {
        flatFareMinor = rule.flatFareMinor;
      } else if (rule.valueType === 'percentage') {
        ruleMultiplier *= (1 + numVal / 100);
      } else if (rule.valueType === 'fixed') {
        // Will be added to fixed fees
      } else {
        ruleMultiplier *= numVal;
      }

      appliedRules.push({
        id: rule.id,
        name: rule.name,
        ruleType: rule.ruleType,
        valueType: rule.valueType,
        value: numVal,
        flatFareMinor: rule.flatFareMinor || null,
      });
      appliedFareRuleIds.push(rule.id);
    }
  }

  // ─── 2. Night Pricing Rules ──────────────────────────────────────────────
  if (rateCard?.pricingPlanId) {
    const nightRules = await db.select().from(nightPricingRules).where(
      and(
        eq(nightPricingRules.pricingPlanId, rateCard.pricingPlanId),
        eq(nightPricingRules.vehicleTypeId, vehicleTypeId),
        eq(nightPricingRules.isActive, true),
      )
    );

    for (const nRule of nightRules) {
      if (isTimeInRange(nRule.startTime, nRule.endTime, nRule.daysOfWeek, timezone)) {
        const val = parseFloat(nRule.value);
        if (nRule.valueType === 'multiplier') {
          ruleMultiplier *= val;
        } else if (nRule.valueType === 'percentage') {
          ruleMultiplier *= (1 + val / 100);
        } else if (nRule.valueType === 'fixed') {
          nightSurchargeMinor += Math.round(val);
        }
        appliedRules.push({ id: nRule.id, name: 'Night Pricing', ruleType: 'night', valueType: nRule.valueType, value: val });
      }
    }
  }

  // ─── 3. Peak Pricing Rules ───────────────────────────────────────────────
  if (rateCard?.pricingPlanId) {
    const peakRules = await db.select().from(peakPricingRules).where(
      and(
        eq(peakPricingRules.pricingPlanId, rateCard.pricingPlanId),
        eq(peakPricingRules.vehicleTypeId, vehicleTypeId),
        eq(peakPricingRules.isActive, true),
      )
    );

    for (const pRule of peakRules) {
      if (isTimeInRange(pRule.startTime, pRule.endTime, pRule.daysOfWeek, timezone)) {
        const val = parseFloat(pRule.value);
        if (pRule.valueType === 'multiplier') {
          ruleMultiplier *= val;
        } else if (pRule.valueType === 'percentage') {
          ruleMultiplier *= (1 + val / 100);
        } else if (pRule.valueType === 'fixed') {
          peakSurchargeMinor += Math.round(val);
        }
        appliedRules.push({ id: pRule.id, name: pRule.name, ruleType: 'peak', valueType: pRule.valueType, value: val });
      }
    }
  }

  // ─── 4. Airport Pricing Rules ────────────────────────────────────────────
  // Check if pickup or drop is in an airport
  let pickupAirport = null;
  let dropAirport = null;

  if (pickupZone) {
    const [ap] = await db.select().from(airports).where(and(eq(airports.zoneId, pickupZone.id), eq(airports.isActive, true))).limit(1);
    pickupAirport = ap || null;
  }
  if (dropZone) {
    const [ap] = await db.select().from(airports).where(and(eq(airports.zoneId, dropZone.id), eq(airports.isActive, true))).limit(1);
    dropAirport = ap || null;
  }

  if (pickupAirport) {
    const apRules = await db.select().from(airportPricingRules).where(
      and(
        eq(airportPricingRules.airportId, pickupAirport.id),
        eq(airportPricingRules.vehicleTypeId, vehicleTypeId),
        eq(airportPricingRules.isActive, true),
        or(eq(airportPricingRules.direction, 'pickup'), eq(airportPricingRules.direction, 'both')),
      )
    );
    for (const rule of apRules) {
      const val = parseFloat(rule.value);
      if (rule.valueType === 'fixed') airportFeeMinor += Math.round(val);
      else if (rule.valueType === 'multiplier') ruleMultiplier *= val;
      appliedRules.push({ id: rule.id, name: `Airport Pickup Fee (${pickupAirport.code})`, ruleType: 'airport', valueType: rule.valueType, value: val });
    }
  }

  if (dropAirport) {
    const apRules = await db.select().from(airportPricingRules).where(
      and(
        eq(airportPricingRules.airportId, dropAirport.id),
        eq(airportPricingRules.vehicleTypeId, vehicleTypeId),
        eq(airportPricingRules.isActive, true),
        or(eq(airportPricingRules.direction, 'drop'), eq(airportPricingRules.direction, 'both')),
      )
    );
    for (const rule of apRules) {
      const val = parseFloat(rule.value);
      if (rule.valueType === 'fixed') airportFeeMinor += Math.round(val);
      else if (rule.valueType === 'multiplier') ruleMultiplier *= val;
      appliedRules.push({ id: rule.id, name: `Airport Drop Fee (${dropAirport.code})`, ruleType: 'airport', valueType: rule.valueType, value: val });
    }
  }

  // ─── 5. Toll Rules ───────────────────────────────────────────────────────
  if (pickupZone && dropZone) {
    const tolls = await db.select().from(tollRules).where(
      and(
        eq(tollRules.isActive, true),
        or(
          and(eq(tollRules.fromZoneId, pickupZone.id), eq(tollRules.toZoneId, dropZone.id)),
          and(eq(tollRules.fromZoneId, dropZone.id), eq(tollRules.toZoneId, pickupZone.id), eq(tollRules.direction, 'both')),
        )
      )
    );
    for (const toll of tolls) {
      tollAmountMinor += toll.amount;
      appliedRules.push({ id: toll.id, name: toll.name, ruleType: 'toll', valueType: 'fixed', value: toll.amount });
    }
  }

  context.pickupAirport = pickupAirport;
  context.dropAirport = dropAirport;
  context.rules = {
    ruleMultiplier: parseFloat(ruleMultiplier.toFixed(4)),
    flatFareMinor,
    nightSurchargeMinor,
    peakSurchargeMinor,
    airportFeeMinor,
    tollAmountMinor,
    appliedRules,
    appliedFareRuleIds,
  };

  return context;
}
