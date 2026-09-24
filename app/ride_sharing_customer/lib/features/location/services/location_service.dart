import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:permission_handler/permission_handler.dart' as ph;

class LocationPermissionResult {
  final bool isGranted;
  final bool isGpsEnabled;
  final String? errorMessage;
  final bool isPermanentlyDenied;

  const LocationPermissionResult({
    required this.isGranted,
    required this.isGpsEnabled,
    this.errorMessage,
    this.isPermanentlyDenied = false,
  });
}

class LocationService {
  /// Checks if location services (GPS) are enabled.
  Future<bool> isLocationServiceEnabled() async {
    try {
      return await Geolocator.isLocationServiceEnabled();
    } catch (_) {
      return false;
    }
  }

  /// Checks and requests location permissions.
  Future<LocationPermissionResult> checkAndRequestPermission() async {
    try {
      final isGpsEnabled = await isLocationServiceEnabled();
      if (!isGpsEnabled) {
        return const LocationPermissionResult(
          isGranted: false,
          isGpsEnabled: false,
          errorMessage: 'Location services (GPS) are disabled on this device.',
        );
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied) {
        return const LocationPermissionResult(
          isGranted: false,
          isGpsEnabled: true,
          errorMessage: 'Location permission was denied.',
        );
      }

      if (permission == LocationPermission.deniedForever) {
        return const LocationPermissionResult(
          isGranted: false,
          isGpsEnabled: true,
          isPermanentlyDenied: true,
          errorMessage:
              'Location permissions are permanently denied. Please enable them in app settings.',
        );
      }

      return const LocationPermissionResult(
        isGranted: true,
        isGpsEnabled: true,
      );
    } catch (e) {
      return LocationPermissionResult(
        isGranted: false,
        isGpsEnabled: false,
        errorMessage: 'Failed to verify location permission: $e',
      );
    }
  }

  /// Fetches the fresh current location from device GPS.
  Future<LatLng?> getCurrentLocation() async {
    try {
      final permissionResult = await checkAndRequestPermission();
      if (!permissionResult.isGranted) {
        return null;
      }

      try {
        final Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 10),
        );
        return LatLng(position.latitude, position.longitude);
      } catch (_) {
        final Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 5),
        );
        return LatLng(position.latitude, position.longitude);
      }
    } catch (e) {
      try {
        final Position? lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null) {
          return LatLng(lastKnown.latitude, lastKnown.longitude);
        }
      } catch (_) {}
      return null;
    }
  }

  /// Listens to continuous, real-time location updates from device GPS.
  Stream<LatLng> getPositionStream({
    LocationAccuracy accuracy = LocationAccuracy.high,
    int distanceFilter = 5,
  }) {
    late LocationSettings locationSettings;

    if (defaultTargetPlatform == TargetPlatform.android) {
      locationSettings = AndroidSettings(
        accuracy: accuracy,
        distanceFilter: distanceFilter,
        forceLocationManager: false,
        intervalDuration: const Duration(seconds: 3),
      );
    } else if (defaultTargetPlatform == TargetPlatform.iOS ||
        defaultTargetPlatform == TargetPlatform.macOS) {
      locationSettings = AppleSettings(
        accuracy: accuracy,
        activityType: ActivityType.fitness,
        distanceFilter: distanceFilter,
        pauseLocationUpdatesAutomatically: true,
      );
    } else {
      locationSettings = LocationSettings(
        accuracy: accuracy,
        distanceFilter: distanceFilter,
      );
    }

    return Geolocator.getPositionStream(locationSettings: locationSettings)
        .map((position) => LatLng(position.latitude, position.longitude));
  }

  /// Opens application settings if permission was permanently denied.
  Future<bool> openAppSettings() async {
    return await ph.openAppSettings();
  }
}
