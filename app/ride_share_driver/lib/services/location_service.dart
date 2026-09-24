import 'package:flutter/foundation.dart';
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

    // Always request a FRESH high-accuracy fix first.
    // lastKnownPosition is intentionally NOT used here because it can be
    // minutes or hours stale — critical when registering the driver's position
    // in the geo-index on go_online.
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (_) {
      // On timeout (rare in well-lit outdoor conditions), try medium accuracy
      // with a shorter timeout before falling back to last known.
      try {
        return await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 5),
        );
      } catch (_) {
        // Last resort: use cached position if available
        final lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null) return lastKnown;
        rethrow;
      }
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

  /// Returns a continuous real-time position stream with platform-appropriate settings.
  /// [distanceFilter] — minimum metres moved before a new position is emitted.
  Stream<Position> getPositionStream({
    LocationAccuracy accuracy = LocationAccuracy.high,
    int distanceFilter = 5,
  }) {
    late LocationSettings settings;

    if (defaultTargetPlatform == TargetPlatform.android) {
      settings = AndroidSettings(
        accuracy: accuracy,
        distanceFilter: distanceFilter,
        forceLocationManager: false,
        intervalDuration: const Duration(seconds: 4),
      );
    } else if (defaultTargetPlatform == TargetPlatform.iOS ||
               defaultTargetPlatform == TargetPlatform.macOS) {
      settings = AppleSettings(
        accuracy: accuracy,
        activityType: ActivityType.automotiveNavigation,
        distanceFilter: distanceFilter,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    } else {
      settings = LocationSettings(
        accuracy: accuracy,
        distanceFilter: distanceFilter,
      );
    }

    return Geolocator.getPositionStream(locationSettings: settings);
  }
}
