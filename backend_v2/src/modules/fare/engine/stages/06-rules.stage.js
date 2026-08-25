import { getActiveRulesForVehicle } from '../../fare-rules.service.js';
import { isTimeInRange } from '../../../../utils/time.js';

/**
 * Stage 6: Dynamic Time, Traffic & Zone Fare Rules.
 */
export async function executeFareRulesStage(context) {
  const { request, country, pickupZone, hexZoneIds, route } = context;
  const vehicleTypeId = request.vehicleTypeId;

  const rules = await getActiveRulesForVehicle(vehicleTypeId, country.id);

  let ruleMultiplier = 1.0;
  let flatFareMinor = null;
  const appliedRules = [];
  const appliedFareRuleIds = [];

  for (const rule of rules) {
    let matches = false;

    if (rule.ruleType === 'time' && rule.startTime && rule.endTime) {
      matches = isTimeInRange(rule.startTime, rule.endTime, rule.daysOfWeek, country.timezone);
    } else if (rule.ruleType === 'traffic') {
      matches = route.trafficDelayS >= (rule.trafficDelayS ?? 300);
    } else if (rule.ruleType === 'zone' && rule.zoneId) {
      matches = pickupZone?.id === rule.zoneId || hexZoneIds.has(rule.zoneId);
    }

    if (matches) {
      if (rule.allowedVehicleTypeIds?.length && !rule.allowedVehicleTypeIds.includes(vehicleTypeId)) {
        throw {
          statusCode: 422,
          message: `Vehicle type not permitted by zone rule "${rule.name}"`,
        };
      }

      if (rule.flatFareMinor != null && flatFareMinor === null) {
        flatFareMinor = rule.flatFareMinor;
      } else {
        ruleMultiplier *= parseFloat(rule.multiplier);
      }

      appliedRules.push({
        id: rule.id,
        name: rule.name,
        ruleType: rule.ruleType,
        multiplier: parseFloat(rule.multiplier),
        flatFareMinor: rule.flatFareMinor || null,
      });

      appliedFareRuleIds.push(rule.id);
    }
  }

  context.rules = {
    ruleMultiplier: parseFloat(ruleMultiplier.toFixed(4)),
    flatFareMinor,
    appliedRules,
    appliedFareRuleIds,
  };

  return context;
}
