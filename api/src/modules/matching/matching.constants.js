module.exports = {
    // Driver dispatch timeouts
    DISPATCH_TIMEOUT_SECONDS: 15,
    
    // Radius expansion parameters
    INITIAL_RADIUS_KM: 2,
    MAX_RADIUS_KM: 8,
    RADIUS_STEP_KM: 3, // 2 -> 5 -> 8

    // Scoring Weights (out of 1.0 total)
    WEIGHTS: {
        DISTANCE: 0.5,        // Nearest is best
        RATING: 0.2,          // Higher rating is better
        ACCEPTANCE_RATE: 0.15,// Highly reliable drivers preferred
        COMPLETION_RATE: 0.15 // Drivers who finish trips preferred
    }
};
