import { getApplicableTaxRules } from '../../tax-rules.service.js';

/**
 * Stage 9: Government Taxes & Regulatory Surcharges.
 */
export async function executeTaxesStage(context) {
  const { country, fees } = context;

  const taxRulesList = await getApplicableTaxRules(country.id, 'fare');

  const exclusiveRate = taxRulesList
    .filter((r) => !r.isInclusive)
    .reduce((sum, r) => sum + parseFloat(r.rate), 0);

  const inclusiveRate = taxRulesList
    .filter((r) => r.isInclusive)
    .reduce((sum, r) => sum + parseFloat(r.rate), 0);

  const exclusiveTaxMinor = Math.round(fees.preTaxFareMinor * exclusiveRate);
  const inclusiveTaxMinor = Math.round(fees.preTaxFareMinor * (inclusiveRate / (1 + inclusiveRate)));

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
      isInclusive: r.isInclusive,
    })),
    postTaxFareMinor,
  };

  return context;
}
