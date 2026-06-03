const TripsService = require("../trips/trips.service");
const TripsRepository = require("../trips/trips.repository");
const MatchingRepository = require("./matching.repository");
const RankingStrategy = require("./strategies/ranking.strategy");
const CONSTANTS = require("./matching.constants");
const { db } = require("../../db/drizzle");

// Helper to delay execution (sleep)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class MatchingService {
    
    /**
     * Process a trip: find drivers, rank them, and offer sequentially.
     * @param {string} tripId 
     * @param {object} redis 
     */
    static async processTrip(tripId, redis = undefined) {
        console.log(`[MatchingService] Processing Trip: ${tripId}`);
        
        let trip = await MatchingRepository.getTrip(tripId);
        if (!trip || trip.status !== "SEARCHING") {
            console.log(`[MatchingService] Trip ${tripId} is no longer SEARCHING. Aborting.`);
            return;
        }

        let radiusKm = CONSTANTS.INITIAL_RADIUS_KM;
        let matched = false;

        // Radius expansion loop
        while (radiusKm <= CONSTANTS.MAX_RADIUS_KM && !matched) {
            console.log(`[MatchingService] Searching drivers for trip ${tripId} at radius ${radiusKm}km...`);
            
            // 1. Discover nearby ONLINE drivers
            let nearbyDrivers = await TripsService.findNearbyDrivers(
                redis, 
                trip.pickupLat, 
                trip.pickupLng, 
                radiusKm
            );

            if (nearbyDrivers.length > 0) {
                // 2. Rank drivers
                const rankedDrivers = RankingStrategy.rank(nearbyDrivers);
                console.log(`[MatchingService] Found ${rankedDrivers.length} drivers. Ranked them.`);

                // 3. Sequential Dispatch
                for (const driver of rankedDrivers) {
                    // Check if trip is still SEARCHING (rider might have cancelled)
                    trip = await MatchingRepository.getTrip(tripId);
                    if (trip.status !== "SEARCHING") {
                        console.log(`[MatchingService] Trip ${tripId} cancelled/changed. Aborting dispatch.`);
                        return;
                    }

                    // Create PENDING offer
                    await TripsRepository.createOffers([{
                        tripId: trip.id,
                        driverId: driver.driverId,
                        status: "PENDING"
                    }]);

                    console.log(`[MatchingService] Offered trip ${tripId} to driver ${driver.driverId}. Waiting ${CONSTANTS.DISPATCH_TIMEOUT_SECONDS}s...`);

                    // Send websocket notification here (future)

                    // Wait for the configured timeout
                    await delay(CONSTANTS.DISPATCH_TIMEOUT_SECONDS * 1000);

                    // Check if driver accepted
                    const offer = await MatchingRepository.getOffer(trip.id, driver.driverId);
                    if (offer && offer.status === "ACCEPTED") {
                        console.log(`[MatchingService] Driver ${driver.driverId} accepted trip ${tripId}.`);
                        matched = true;
                        break; // Stop matching!
                    }

                    // If not accepted, expire it and move to next driver
                    console.log(`[MatchingService] Driver ${driver.driverId} did not accept. Expiring offer.`);
                    await MatchingRepository.expireOffer(trip.id, driver.driverId);
                }
            }

            if (!matched) {
                radiusKm += CONSTANTS.RADIUS_STEP_KM;
            }
        }

        // If loop completes and no one matched, set NO_DRIVER_FOUND
        if (!matched) {
            console.log(`[MatchingService] No drivers accepted trip ${tripId} up to ${CONSTANTS.MAX_RADIUS_KM}km. Marking NO_DRIVER_FOUND.`);
            try {
                await TripsService.markNoDriverFound(tripId, null, redis);
            } catch (error) {
                console.error(`[MatchingService] Error marking no driver found:`, error);
            }
        }
    }
}

module.exports = MatchingService;
