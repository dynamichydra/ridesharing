function haversineDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {
    lat1 = Number(lat1);
    lon1 = Number(lon1);
    lat2 = Number(lat2);
    lon2 = Number(lon2);

    const toRad =
        (value) =>
            (value * Math.PI) /
            180;

    const R = 6371;

    const dLat =
        toRad(
            lat2 - lat1
        );

    const dLon =
        toRad(
            lon2 - lon1
        );

    const a =
        Math.sin(
            dLat / 2
        ) **
        2 +
        Math.cos(
            toRad(lat1)
        ) *
        Math.cos(
            toRad(lat2)
        ) *
        Math.sin(
            dLon / 2
        ) **
        2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(
                1 - a
            )
        );

    const distance =
        R * c;

    console.log({
        lat1,
        lon1,
        lat2,
        lon2,
        distance,
    });

    return Number(
        distance.toFixed(2)
    );
}

module.exports = {
    haversineDistance,
};