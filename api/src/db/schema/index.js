module.exports = {
    ...require("./users.schema"),
    ...require("./drivers.schema"),
    ...require("./trips.schema"),
    ...require(
        "./trip-status-history.schema"
    ),
    ...require("../enums/index"),
    ...require("../schema/driver-location.schema"),
    ...require("../schema/trip-offer.schema")
};