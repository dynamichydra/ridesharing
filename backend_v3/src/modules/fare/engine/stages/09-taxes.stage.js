import { getApplicableTaxRules } from '../../tax-rules.service.js';

/**
 * Stage 9: Government Taxes & Regulatory Surcharges.
 *
 * Primary: Uses rateCard.taxPercentage (specific per city + vehicle type).
 * Fallback: Uses state/country level tax_rules if rateCard.taxPercentage is 0 or null.
 */
export async function executeTaxesStage(context) {
  const { country, fees, rateCard } = context;

  const cardTaxRatePercent = rateCard?.taxPercentage ? parseFloat(rateCard.taxPercentage) : 0;

  let exclusiveTaxMinor = 0;
  let inclusiveTaxMinor = 0;
  let taxRulesList = [];

  if (cardTaxRatePercent > 0) {
    // City + Vehicle-Type specific tax rate from pricing_versions
    const rateDecimal = cardTaxRatePercent / 100;
    exclusiveTaxMinor = Math.round(fees.preTaxFareMinor * rateDecimal);
    taxRulesList = [{
      id: 'pricing_version_tax',
      name: `City/Vehicle Tax (${cardTaxRatePercent}%)`,
      rate: rateDecimal,
      isInclusive: false,
    }];
  } else if (country?.id || context.cityId) {
    const countryId = country?.id || context.countryId;
    const cityId = context.cityId || null;
    const stateId = context.stateId || null;

    // Fallback to tax_rules table (city/state/country level rules)
    taxRulesList = await getApplicableTaxRules(countryId, 'fare', { stateId, cityId });

    const exclusiveRate = taxRulesList
      .filter((r) => !r.isInclusive)
      .reduce((sum, r) => sum + parseFloat(r.rate), 0);

    const inclusiveRate = taxRulesList
      .filter((r) => r.isInclusive)
      .reduce((sum, r) => sum + parseFloat(r.rate), 0);

    exclusiveTaxMinor = Math.round(fees.preTaxFareMinor * exclusiveRate);
    inclusiveTaxMinor = Math.round(fees.preTaxFareMinor * (inclusiveRate / (1 + inclusiveRate)));
  }

  const totalTaxMinor = exclusiveTaxMinor;
  const postTaxFareMinor = fees.preTaxFareMinor + totalTaxMinor;

  context.taxes = {
    exclusiveTaxMinor,
    inclusiveTaxMinor,
    totalTaxMinor,
    taxRules: taxRulesList.map((r) => ({
      id: r.id,
      name: r.name,
      rate: r.rate,
      isInclusive: r.isInclusive || false,
    })),
    postTaxFareMinor,
  };

  return context;
}
