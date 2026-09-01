import 'package:geolocator/geolocator.dart';

/// Thin wrapper around `geolocator` so callers never talk to the plugin
/// directly. Reuses geolocator's own `PermissionDeniedException` /
/// `LocationServiceDisabledException` rather than introducing parallel
/// custom types for conditions the plugin already models.
class LocationService {
  Future<Position> getCurrentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const LocationServiceDisabledException();
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied) {
      throw const PermissionDeniedException('Location permission was denied.');
    }
    if (permission == LocationPermission.deniedForever) {
      throw const PermissionDeniedException(
        'Location permission is permanently denied. Enable it from device settings to go online.',
      );
    }

    // 1. Check last known position first for instantaneous (<10ms) response
    try {
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) {
        return lastKnown;
      }
    } catch (_) {}

    // 2. Otherwise get current position with short 3s timeout
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 3),
      );
    } catch (_) {
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) return lastKnown;
      rethrow;
    }
  }

  /// Returns 'IN' for India, 'CA' for Canada, or null if outside supported regions.
  static String? getSupportedCountryCode(double latitude, double longitude) {
    // Canada bounds approx: Lat 41.0 to 83.0, Lon -141.0 to -52.0
    if (latitude >= 41.0 && latitude <= 83.0 &&
        longitude >= -141.0 && longitude <= -52.0) {
      return 'CA';
    }
    // India bounds approx: Lat 6.0 to 37.5, Lon 68.0 to 97.5
    if (latitude >= 6.0 && latitude <= 37.5 &&
        longitude >= 68.0 && longitude <= 97.5) {
      return 'IN';
    }
    return null;
  }

  Stream<Position> getPositionStream({LocationSettings? locationSettings}) {
    final settings = locationSettings ??
        const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: 3,
        );
    return Geolocator.getPositionStream(locationSettings: settings);
  }
}
