/**
 * Handler for `trip.accepted` event.
 * Mocks sending a push notification to the rider that their driver is on the way.
 */
async function tripAcceptedHandler(payload, envelope) {
    const { tripId, driverId, riderId } = payload;
    
    console.log(`[Handler: TripAccepted] Dispatching push notification to rider ${riderId}`);
    
    // Simulate sending FCM/APNS notification
    await new Promise(res => setTimeout(res, 100));
    
    console.log(`[Handler: TripAccepted] Push notification sent for trip ${tripId} (Driver: ${driverId})`);
}

module.exports = tripAcceptedHandler;
