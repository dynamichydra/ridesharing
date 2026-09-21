import { resolvePricingVersion } from '../../pricing-card.service.js';

/**
 * Stage 4: Versioned Pricing Profile & Rate Card Resolution.
 */
export async function executePricingCardStage(context) {
  const { vehicleTypeId } = context.request;
  const cityId = context.cityId || context.request?.cityId || null;
  const zoneId = context.pickupZone?.id || context.request?.zoneId || null;
  const countryId = context.countryId || context.request?.countryId || null;

  const { version: rateCard, source } = await resolvePricingVersion({
    vehicleTypeId,
    cityId,
    zoneId,
    countryId,
  });

  context.rateCard = rateCard;
  context.pricingVersionId = rateCard.id || null;
  context.pricingVersionNumber = rateCard.version || 1;
  context.pricingSource = source;
  context.vehicleTypeName = rateCard.vehicleType?.name || context.vehicleTypeName || 'Standard';

  return context;
}
