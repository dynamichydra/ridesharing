import { resolvePricingVersion } from '../../pricing-card.service.js';

/**
 * Stage 4: Versioned Pricing Profile & Rate Card Resolution.
 */
export async function executePricingCardStage(context) {
  const { vehicleTypeId } = context.request;
  const cityId = context.cityId || null;
  const zoneId = context.pickupZone?.id || null;

  const { version: rateCard, source, vehicleType } = await resolvePricingVersion({
    vehicleTypeId,
    cityId,
    zoneId,
  });

  context.rateCard = rateCard;
  context.pricingVersionId = rateCard.id || null;
  context.pricingVersionNumber = rateCard.version || 1;
  context.pricingSource = source;
  context.vehicleTypeName = rateCard.vehicleTypeName || vehicleType?.name || 'Standard';

  return context;
}
