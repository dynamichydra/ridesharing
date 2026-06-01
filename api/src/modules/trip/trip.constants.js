const TRIP_STATUS = {
    SEARCHING:
        "SEARCHING",

    ACCEPTED:
        "ACCEPTED",

    ARRIVED:
        "ARRIVED",

    IN_PROGRESS:
        "IN_PROGRESS",

    COMPLETED:
        "COMPLETED",

    CANCELLED:
        "CANCELLED",

    EXPIRED:
        "EXPIRED",
};

const ALLOWED_TRANSITIONS =
{
    SEARCHING: [
        "ACCEPTED",
        "CANCELLED",
        "EXPIRED",
    ],

    ACCEPTED: [
        "ARRIVED",
        "CANCELLED",
    ],

    ARRIVED: [
        "IN_PROGRESS",
        "CANCELLED",
    ],

    IN_PROGRESS: [
        "COMPLETED",
    ],

    COMPLETED: [],

    CANCELLED: [],

    EXPIRED: [],
};

module.exports = {
    TRIP_STATUS,
    ALLOWED_TRANSITIONS,
};