import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Supported travel modes for Google Routes API.
/// Defaults to [drive] for all ride-booking flows.
enum AppTravelMode {
  drive,
  twoWheeler,
  walk,
  bicycle,
  transit,
}

extension AppTravelModeExtension on AppTravelMode {
  /// Returns the string value expected by the Routes API v2.
  String get apiValue {
    switch (this) {
      case AppTravelMode.drive:
        return 'DRIVE';
      case AppTravelMode.twoWheeler:
        return 'TWO_WHEELER';
      case AppTravelMode.walk:
        return 'WALK';
      case AppTravelMode.bicycle:
        return 'BICYCLE';
      case AppTravelMode.transit:
        return 'TRANSIT';
    }
  }
}

/// Represents a computed driving route returned from Google Maps Routes API.
///
/// Use [decodedPoints] to draw a Polyline on the map.
/// Use [formattedDistance] and [formattedDuration] for display in UI.
/// Use [bounds] with [CameraUpdate.newLatLngBounds] to auto-fit the camera.
class RouteModel {
  /// Raw encoded polyline string from Routes API.
  final String encodedPolyline;

  /// Decoded list of [LatLng] points ready to use with [GoogleMap.polylines].
  final List<LatLng> decodedPoints;

  /// Total route distance in metres.
  final int distanceMeters;

  /// Human-readable distance string (e.g. "12.4 km").
  final String formattedDistance;

  /// Total route duration in seconds (without traffic).
  final int durationSeconds;

  /// Human-readable duration string (e.g. "18 min").
  final String formattedDuration;

  /// Travel mode used to compute this route.
  final AppTravelMode travelMode;

  /// Bounding box containing the entire route.
  /// Pass to [CameraUpdate.newLatLngBounds] with appropriate padding.
  final LatLngBounds? bounds;

  const RouteModel({
    required this.encodedPolyline,
    required this.decodedPoints,
    required this.distanceMeters,
    required this.formattedDistance,
    required this.durationSeconds,
    required this.formattedDuration,
    required this.travelMode,
    this.bounds,
  });

  /// Returns true if the route has usable coordinate points.
  bool get hasPoints => decodedPoints.isNotEmpty;

  @override
  String toString() {
    return 'RouteModel('
        'travelMode: ${travelMode.apiValue}, '
        'distance: $formattedDistance, '
        'duration: $formattedDuration, '
        'points: ${decodedPoints.length}'
        ')';
  }
}
