import { isLocationInServiceArea } from '../../../zone/zone.service.js';

/**
 * Stage 1: Validate pickup (and optionally dropoff) coordinates against active service boundaries.
 */
export async function executeServiceAreaStage(context) {
  const { pickupLat, pickupLng, dropLat, dropLng } = context.request;

  const pickupAreaCheck = await isLocationInServiceArea(pickupLat, pickupLng);
  if (!pickupAreaCheck.inServiceArea) {
    throw {
      statusCode: 400,
      code: pickupAreaCheck.reason,
      message: pickupAreaCheck.message,
    };
  }

  context.serviceArea = pickupAreaCheck.serviceArea;
  context.cityId = pickupAreaCheck.city?.id || pickupAreaCheck.serviceArea?.cityId || context.request.cityId || null;
  context.countryId = pickupAreaCheck.serviceArea?.countryId || context.request.countryId || null;
  context.timezone = pickupAreaCheck.city?.timezone || null;
  context.pickupZone = pickupAreaCheck.zone || null;

  return context;
}
