import { isLocationInServiceArea } from '../../../zone/zone.service.js';

/**
 * Stage 1: Validate pickup and dropoff coordinates against active city operational boundaries.
 */
export async function executeServiceAreaStage(context) {
  const { pickupLat, pickupLng, dropLat, dropLng } = context.request;

  // 1. Validate Pickup Location
  const pickupCheck = await isLocationInServiceArea(pickupLat, pickupLng);
  if (!pickupCheck.inServiceArea) {
    throw {
      statusCode: 400,
      code: pickupCheck.reason,
      message: `Pickup location error: ${pickupCheck.message}`,
    };
  }

  // 2. Validate Drop-off Location (if provided)
  let dropCheck = null;
  if (dropLat != null && dropLng != null) {
    dropCheck = await isLocationInServiceArea(dropLat, dropLng);
    if (!dropCheck.inServiceArea) {
      throw {
        statusCode: 400,
        code: dropCheck.reason === 'OUT_OF_SERVICE_AREA' ? 'DROP_OUT_OF_SERVICE_AREA' : dropCheck.reason,
        message: `Drop-off location error: ${dropCheck.message}`,
      };
    }
  }

  context.city = pickupCheck.city || null;
  context.cityId = pickupCheck.city?.id || context.request.cityId || null;
  context.cityTypeId = pickupCheck.city?.cityTypeId || context.request.cityTypeId || null;
  context.countryId = pickupCheck.city?.countryId || context.request.countryId || null;
  context.timezone = pickupCheck.city?.timezone || null;
  context.pickupZone = pickupCheck.zone || null;
  context.dropZone = dropCheck?.zone || null;
  context.dropCity = dropCheck?.city || null;

  return context;
}
