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

    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }
}
