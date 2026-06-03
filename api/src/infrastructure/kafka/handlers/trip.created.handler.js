/**
 * Handler for `trip.created` event.
 * Mocks preparing an analytics event or initializing push notification context.
 */
async function tripCreatedHandler(payload, envelope) {
    const { tripId, riderId } = payload;
    
    console.log(`[Handler: TripCreated] Processing trip ${tripId} for rider ${riderId}`);
    
    // Simulate async background job (e.g., logging to a data warehouse)
    await new Promise(res => setTimeout(res, 50));
    
    console.log(`[Handler: TripCreated] Successfully logged trip ${tripId} to analytics.`);
}

module.exports = tripCreatedHandler;
