import { validateLocationInServiceArea } from '../../../geo/service-area.service.js';

/**
 * Stage 1: Validate pickup (and optionally dropoff) coordinates against active service boundaries.
 */
export async function executeServiceAreaStage(context) {
  const { pickupLat, pickupLng, dropLat, dropLng } = context.request;

  const pickupAreaCheck = await validateLocationInServiceArea(pickupLat, pickupLng);
  if (!pickupAreaCheck.isAvailable) {
    throw {
      statusCode: 400,
      code: pickupAreaCheck.reason,
      message: pickupAreaCheck.message,
    };
  }

  context.serviceArea = pickupAreaCheck.serviceArea;
  context.cityId = pickupAreaCheck.cityId || context.request.cityId || null;
  context.countryId = pickupAreaCheck.countryId || context.request.countryId || null;
  context.timezone = pickupAreaCheck.timezone || null;

  return context;
}
