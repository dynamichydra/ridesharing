/**
 * Canonical trip status values – must stay in sync with the
 * `trip_status` PostgreSQL enum defined in src/db/enums/index.js.
 */
const TRIP_STATUS = {
    SEARCHING: "SEARCHING",
    DRIVER_ASSIGNED: "DRIVER_ASSIGNED",
    DRIVER_ARRIVING: "DRIVER_ARRIVING",
    STARTED: "STARTED",
    COMPLETED: "COMPLETED",
    CANCELLED: "CANCELLED",
    NO_DRIVER_FOUND: "NO_DRIVER_FOUND",
};

/**
 * State machine transition table.
 * Key   = current status
 * Value = array of valid next statuses
 */
const ALLOWED_TRANSITIONS = {
    [TRIP_STATUS.SEARCHING]: [
        TRIP_STATUS.DRIVER_ASSIGNED,
        TRIP_STATUS.CANCELLED,
        TRIP_STATUS.NO_DRIVER_FOUND,
    ],
    [TRIP_STATUS.DRIVER_ASSIGNED]: [
        TRIP_STATUS.DRIVER_ARRIVING,
        TRIP_STATUS.CANCELLED,
    ],
    [TRIP_STATUS.DRIVER_ARRIVING]: [
        TRIP_STATUS.STARTED,
        TRIP_STATUS.CANCELLED,
    ],
    [TRIP_STATUS.STARTED]: [TRIP_STATUS.COMPLETED],
    [TRIP_STATUS.COMPLETED]: [],
    [TRIP_STATUS.CANCELLED]: [],
    [TRIP_STATUS.NO_DRIVER_FOUND]: [],
};

/**
 * Maps a new status value to the trips table timestamp column
 * that should be set when that status is entered.
 */
const STATUS_TIMESTAMP_MAP = {
    [TRIP_STATUS.DRIVER_ASSIGNED]: "acceptedAt",
    [TRIP_STATUS.DRIVER_ARRIVING]: "arrivedAt",
    [TRIP_STATUS.STARTED]: "startedAt",
    [TRIP_STATUS.COMPLETED]: "completedAt",
    [TRIP_STATUS.CANCELLED]: "cancelledAt",
};

/**
 * Statuses from which a DRIVER is permitted to cancel.
 */
const DRIVER_CANCELLABLE_STATUSES = [
    TRIP_STATUS.DRIVER_ASSIGNED,
    TRIP_STATUS.DRIVER_ARRIVING,
];

/**
 * Statuses from which a RIDER is permitted to cancel.
 */
const RIDER_CANCELLABLE_STATUSES = [
    TRIP_STATUS.SEARCHING,
    TRIP_STATUS.DRIVER_ASSIGNED,
    TRIP_STATUS.DRIVER_ARRIVING,
];

module.exports = {
    TRIP_STATUS,
    ALLOWED_TRANSITIONS,
    STATUS_TIMESTAMP_MAP,
    DRIVER_CANCELLABLE_STATUSES,
    RIDER_CANCELLABLE_STATUSES,
};
