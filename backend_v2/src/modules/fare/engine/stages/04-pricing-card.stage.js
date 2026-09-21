import { resolvePricingVersion } from '../../pricing-card.service.js';

/**
 * Stage 4: City-Type Vehicle Rate Card Resolution.
 */
export async function executePricingCardStage(context) {
  const { vehicleTypeId } = context.request;
  const cityId = context.cityId || null;
  const cityTypeId = context.cityTypeId || null;

  const { version: rateCard, source, vehicleType } = await resolvePricingVersion({
    vehicleTypeId,
    cityId,
    cityTypeId,
  });

  context.rateCard = rateCard;
  context.cityTypeFareId = rateCard.id || null;
  context.pricingSource = source;
  context.vehicleTypeName = rateCard.vehicleTypeName || vehicleType?.name || 'Standard';

  return context;
}
