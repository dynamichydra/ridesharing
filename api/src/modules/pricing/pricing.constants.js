const PRICING_CONSTANTS = {
    // Night pricing (e.g. 11 PM - 5 AM)
    NIGHT_START_HOUR: 23,
    NIGHT_END_HOUR: 5,
    NIGHT_MULTIPLIER_MIN: 1.2,
    NIGHT_MULTIPLIER_MAX: 1.5,

    // Peak hour pricing (Morning: 8 AM - 11 AM, Evening: 5 PM - 9 PM)
    MORNING_PEAK_START: 8,
    MORNING_PEAK_END: 11,
    EVENING_PEAK_START: 17,
    EVENING_PEAK_END: 21,
    PEAK_MULTIPLIER_MIN: 1.2,
    PEAK_MULTIPLIER_MAX: 2.0,

    // Traffic multipliers
    TRAFFIC_MULTIPLIER_HEAVY: 1.5,
    TRAFFIC_MULTIPLIER_MODERATE: 1.15,
    
    // Surge limits
    SURGE_MIN: 1.0,
    SURGE_MAX: 3.0,

    // Zone/Area fees
    ZONES: {
        AIRPORT: {
            lat: 12.971598, // Example mockup
            lng: 77.594562,
            radiusKm: 2.0,
            fee: 50.0 // Added fixed fee for airport
        },
        BUSINESS_DISTRICT: {
            lat: 12.935116,
            lng: 77.624480,
            radiusKm: 1.5,
            fee: 20.0
        }
    }
};

module.exports = PRICING_CONSTANTS;
