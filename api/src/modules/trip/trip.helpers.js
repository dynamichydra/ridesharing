const {
    ALLOWED_TRANSITIONS,
} = require(
    "./trip.constants"
);

function canTransition(
    currentStatus,
    newStatus
) {
    const allowed =
        ALLOWED_TRANSITIONS[
        currentStatus
        ] || [];

    return allowed.includes(
        newStatus
    );
}

module.exports = {
    canTransition,
};