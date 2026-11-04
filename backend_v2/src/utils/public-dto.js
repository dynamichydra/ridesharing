/**
 * Allow-list views of account rows for anything a *rider* (or any other non-admin party)
 * receives — REST responses, socket events, Kafka payloads that get forwarded to sockets.
 *
 * Never send a raw `drivers` row to a rider: it carries Aadhaar/licence numbers and document
 * links, DOB, email, the FCM token and internal review notes.
 */
export function toPublicDriver(driver) {
  if (!driver) return null;
  return {
    id: driver.id,
    name: driver.name,
    phone: driver.phone, // riders need it to call the driver during a trip
    profilePhoto: driver.profilePhoto ?? null,
    rating: driver.rating ?? null,
    totalRides: driver.totalRides ?? null,
    vehicleNumber: driver.vehicleNumber ?? null,
    vehicleModel: driver.vehicleModel ?? null,
    vehicleTypeId: driver.vehicleTypeId ?? null,
    currentLat: driver.currentLat ?? null,
    currentLng: driver.currentLng ?? null,
  };
}
