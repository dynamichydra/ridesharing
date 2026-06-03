const TOPICS = require("../topics");
const tripCreatedHandler = require("./trip.created.handler");
const tripAcceptedHandler = require("./trip.accepted.handler");
const tripCompletedHandler = require("./trip.completed.handler");

/**
 * Maps topics to their respective handler functions.
 * Used by app.js to register all handlers to the KafkaConsumer.
 */
module.exports = {
    [TOPICS.TRIP_CREATED]: tripCreatedHandler,
    [TOPICS.TRIP_ACCEPTED]: tripAcceptedHandler,
    [TOPICS.TRIP_COMPLETED]: tripCompletedHandler,
};
