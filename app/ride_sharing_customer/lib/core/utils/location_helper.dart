import 'dart:math';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class LocationHelper {
  /// Calculate distance between two coordinates in kilometers using Haversine formula
  static double calculateDistance(double startLat, double startLng, double endLat, double endLng) {
    const double earthRadiusKm = 6371.0; // Earth radius in kilometers
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

  static double _degreesToRadians(double degrees) {
    return degrees * pi / 180;
  }

  /// Calculates the bearing (direction) in degrees between two points
  static double calculateBearing(double startLat, double startLng, double endLat, double endLng) {
    final double lat1 = _degreesToRadians(startLat);
    final double lng1 = _degreesToRadians(startLng);
    final double lat2 = _degreesToRadians(endLat);
    final double lng2 = _degreesToRadians(endLng);

    final double dLng = lng2 - lng1;

    final double y = sin(dLng) * cos(lat2);
    final double x = cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(dLng);

    final double radians = atan2(y, x);
    return (_radiansToDegrees(radians) + 360) % 360;
  }

  static double _radiansToDegrees(double radians) {
    return radians * 180 / pi;
  }

  /// Generates a list of coordinates interpolating between start and end coordinates
  static List<LatLng> generateRoutePoints(LatLng start, LatLng end, int steps) {
    final List<LatLng> points = [];
    for (int i = 0; i <= steps; i++) {
      final double t = i / steps;
      final double lat = start.latitude + (end.latitude - start.latitude) * t;
      final double lng = start.longitude + (end.longitude - start.longitude) * t;
      points.add(LatLng(lat, lng));
    }
    return points;
  }
}
