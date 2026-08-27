import 'dart:math';
import 'package:google_maps_flutter/google_maps_flutter.dart';

/// Utility class with pure geospatial math helpers.
///
/// All fake route generation methods have been removed.
/// Route data is now sourced exclusively from [GoogleRoutesService].
class LocationHelper {
  /// Calculate distance between two coordinates in kilometres
  /// using the Haversine formula.
  static double calculateDistance(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    const double earthRadiusKm = 6371.0;
    final double dLat = _degreesToRadians(endLat - startLat);
    final double dLng = _degreesToRadians(endLng - startLng);

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_degreesToRadians(startLat)) *
            cos(_degreesToRadians(endLat)) *
            sin(dLng / 2) *
            sin(dLng / 2);

    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadiusKm * c;
  }

  /// Calculates the bearing (direction) in degrees between two geographic
  /// coordinates. Used for rotating the driver marker arrow.
  static double calculateBearing(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    final double lat1 = _degreesToRadians(startLat);
    final double lng1 = _degreesToRadians(startLng);
    final double lat2 = _degreesToRadians(endLat);
    final double lng2 = _degreesToRadians(endLng);

    final double dLng = lng2 - lng1;

    final double y = sin(dLng) * cos(lat2);
    final double x =
        cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng);

    final double radians = atan2(y, x);
    return (_radiansToDegrees(radians) + 360) % 360;
  }

  static double _degreesToRadians(double degrees) => degrees * pi / 180;
  static double _radiansToDegrees(double radians) => radians * 180 / pi;

  /// Finds the index of the closest coordinate in a polyline to [target].
  static int findClosestPointIndex(LatLng target, List<LatLng> polyline) {
    if (polyline.isEmpty) return 0;
    int closestIdx = 0;
    double minDistance = double.infinity;

    for (int i = 0; i < polyline.length; i++) {
      final d = calculateDistance(
        target.latitude,
        target.longitude,
        polyline[i].latitude,
        polyline[i].longitude,
      );
      if (d < minDistance) {
        minDistance = d;
        closestIdx = i;
      }
    }
    return closestIdx;
  }

  /// Trims already traversed polyline points, returning the remaining route
  /// starting with [currentPos] followed by future upcoming waypoints.
  static List<LatLng> trimRoute(
    dynamic currentPos,
    List<dynamic> routePoints, {
    int? closestIndex,
  }) {
    if (routePoints.isEmpty) return [currentPos];
    final idx = closestIndex ??
        findClosestPointIndex(
          currentPos,
          routePoints.cast(),
        );

    if (idx >= routePoints.length - 1) {
      return [currentPos, routePoints.last];
    }

    // Return the driver's current position connected to upcoming remaining points
    return [currentPos, ...routePoints.sublist(idx + 1)];
  }
}
