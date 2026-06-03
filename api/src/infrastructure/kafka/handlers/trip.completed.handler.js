/**
 * Handler for `trip.completed` event.
 * Mocks triggering the payment processing pipeline and analytics.
 */
async function tripCompletedHandler(payload, envelope) {
    const { tripId, driverId, finalFare } = payload;
    
    console.log(`[Handler: TripCompleted] Initiating payment of ${finalFare} for trip ${tripId}`);
    
    // Simulate async payment processing
    await new Promise(res => setTimeout(res, 200));
    
    console.log(`[Handler: TripCompleted] Payment processed for driver ${driverId}.`);
    
    // If it fails, it will automatically throw and hit the DLQ based on the Consumer logic.
    // e.g., throw new Error("Payment gateway timeout");
}

module.exports = tripCompletedHandler;
