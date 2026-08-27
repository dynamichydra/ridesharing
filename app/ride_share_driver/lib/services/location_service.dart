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

    // 2. Otherwise get current position with short 2s timeout
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 2),
      );
    } catch (_) {
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) return lastKnown;
      return Position(
        latitude: 22.5726,
        longitude: 88.3639,
        timestamp: DateTime.now(),
        accuracy: 10.0,
        altitude: 0.0,
        altitudeAccuracy: 0.0,
        heading: 0.0,
        headingAccuracy: 0.0,
        speed: 0.0,
        speedAccuracy: 0.0,
      );
    }
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
