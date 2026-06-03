const RoutingProvider = require("./providers/routing.provider");
const CONSTANTS = require("./pricing.constants");
const vehiclePricingConfig = require("../../config/vehicle-pricing.config");
// Existing surge service if we want to integrate, but we will mock a complex one here
const { getSurgeMultiplier } = require("../trips/trips.surge.service"); 

class PricingService {
    static _calculateNightMultiplier(currentDate = new Date()) {
        const hour = currentDate.getHours();
        if (hour >= CONSTANTS.NIGHT_START_HOUR || hour < CONSTANTS.NIGHT_END_HOUR) {
            return CONSTANTS.NIGHT_MULTIPLIER_MIN; // Can add logic to scale up to MAX
        }
        return 1.0;
    }

    static _calculatePeakMultiplier(currentDate = new Date()) {
        const hour = currentDate.getHours();
        if (
            (hour >= CONSTANTS.MORNING_PEAK_START && hour < CONSTANTS.MORNING_PEAK_END) ||
            (hour >= CONSTANTS.EVENING_PEAK_START && hour < CONSTANTS.EVENING_PEAK_END)
        ) {
            return CONSTANTS.PEAK_MULTIPLIER_MIN; 
        }
        return 1.0;
    }

    static _calculateTrafficMultiplier(estimatedDurationMinutes, idealDurationMinutes) {
        if (!idealDurationMinutes) return 1.0;
        const ratio = estimatedDurationMinutes / idealDurationMinutes;
        if (ratio > 1.5) return CONSTANTS.TRAFFIC_MULTIPLIER_HEAVY;
        if (ratio > 1.2) return CONSTANTS.TRAFFIC_MULTIPLIER_MODERATE;
        return 1.0;
    }

    static _calculateZoneFee(lat, lng) {
        // Haversine implementation for zone check
        const toRad = (value) => (value * Math.PI) / 180;
        
        for (const [zoneName, zone] of Object.entries(CONSTANTS.ZONES)) {
            const R = 6371; // km
            const dLat = toRad(lat - zone.lat);
            const dLng = toRad(lng - zone.lng);
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(toRad(zone.lat)) * Math.cos(toRad(lat)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance <= zone.radiusKm) {
                return zone.fee;
            }
        }
        return 0;
    }

    static async estimateFare(pickupLat, pickupLng, destLat, destLng, vehicleType) {
        // 1. Get road distance and duration from Routing Provider
        const { distanceKm, durationMinutes } = await RoutingProvider.getRouteInfo(
            pickupLat, pickupLng, destLat, destLng
        );

        // 2. Fetch vehicle pricing configuration
        // Fallback to UBER_GO config if requested type is not found
        const config = vehiclePricingConfig[vehicleType] || vehiclePricingConfig.UBER_GO;

        // 3. Base calculations
        const baseFare = config.baseFare || 0;
        const distanceFare = distanceKm * (config.perKmRate || 0);
        const timeFare = durationMinutes * (config.perMinuteRate || 0);

        // 4. Time-based Multipliers
        const now = new Date();
        const nightMultiplier = this._calculateNightMultiplier(now);
        const peakMultiplier = this._calculatePeakMultiplier(now);

        // 5. Traffic Multiplier (Simulated ideal speed of 40km/h for city)
        const idealDurationMinutes = (distanceKm / 40) * 60;
        const trafficMultiplier = this._calculateTrafficMultiplier(durationMinutes, idealDurationMinutes);

        // 6. Demand/Supply Surge
        // Fallback to existing mocked surge if Redis-based surge is unavailable
        let demandMultiplier = 1.0;
        try {
            demandMultiplier = await getSurgeMultiplier();
        } catch (e) {
            // Ignore error, fallback to 1.0
        }
        // Clamp demand multiplier
        demandMultiplier = Math.max(CONSTANTS.SURGE_MIN, Math.min(demandMultiplier, CONSTANTS.SURGE_MAX));

        // 7. Area-Based Pricing (Check pickup zone)
        const zoneFee = this._calculateZoneFee(pickupLat, pickupLng);

        // 8. Calculate Final Fare
        // (Base + Distance + Time) * (Multipliers) + Flat Fees
        // We take the max of time multipliers to avoid compounding ridiculously high fares,
        // but multiply by demand and traffic separately as they are distinct factors.
        const maxTimeMultiplier = Math.max(nightMultiplier, peakMultiplier);
        const totalSurgeMultiplier = maxTimeMultiplier * trafficMultiplier * demandMultiplier;
        
        let estimatedFare = (baseFare + distanceFare + timeFare) * totalSurgeMultiplier;
        estimatedFare += zoneFee;
        
        if (config.bookingFee) {
            estimatedFare += config.bookingFee;
        }

        // 9. Enforce Minimum Fare
        estimatedFare = Math.max(estimatedFare, config.minimumFare || 0);

        return {
            estimatedFare: Number(estimatedFare.toFixed(2)),
            roadDistanceKm: Number(distanceKm.toFixed(2)),
            estimatedDurationMinutes: Math.ceil(durationMinutes),
            surgeMultiplier: Number(totalSurgeMultiplier.toFixed(2)),
            pricingBreakdown: {
                baseFare: Number(baseFare.toFixed(2)),
                distanceFare: Number(distanceFare.toFixed(2)),
                timeFare: Number(timeFare.toFixed(2)),
                trafficMultiplier: Number(trafficMultiplier.toFixed(2)),
                nightMultiplier: Number(nightMultiplier.toFixed(2)),
                peakMultiplier: Number(peakMultiplier.toFixed(2)),
                demandMultiplier: Number(demandMultiplier.toFixed(2)),
                zoneFee: Number(zoneFee.toFixed(2))
            }
        };
    }
}

module.exports = PricingService;
