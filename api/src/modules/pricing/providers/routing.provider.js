/**
 * RoutingProvider abstracts the interaction with external routing APIs (like OSRM, Google Maps).
 */
class RoutingProvider {
    /**
     * Get route details between two coordinates.
     * @param {number} pickupLat 
     * @param {number} pickupLng 
     * @param {number} destLat 
     * @param {number} destLng 
     * @returns {Promise<{distanceKm: number, durationMinutes: number}>}
     */
    static async getRouteInfo(pickupLat, pickupLng, destLat, destLng) {
        // Using OSRM public API for now. 
        // Can be swapped to a self-hosted OSRM via ENV variables.
        const osrmUrl = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';
        const url = `${osrmUrl}/route/v1/driving/${pickupLng},${pickupLat};${destLng},${destLat}?overview=false`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`OSRM routing failed with status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.routes || data.routes.length === 0) {
                throw new Error('No route found between the provided coordinates.');
            }

            const route = data.routes[0];
            const distanceKm = route.distance / 1000;
            const durationMinutes = route.duration / 60;

            return {
                distanceKm,
                durationMinutes
            };
        } catch (error) {
            console.error('[RoutingProvider] Error fetching route:', error.message);
            // Fallback strategy could be implemented here (e.g. Haversine distance as last resort),
            // but for a strict requirement, we fail loudly.
            throw new Error('Failed to calculate road distance and duration.');
        }
    }
}

module.exports = RoutingProvider;
