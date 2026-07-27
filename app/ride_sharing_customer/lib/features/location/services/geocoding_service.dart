import 'package:geocoding/geocoding.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/location_model.dart';

class GeocodingService {
  final Geocoding _geocoding;

  GeocodingService({Geocoding? geocoding})
      : _geocoding = geocoding ?? Geocoding();

  /// Converts latitude and longitude into a clean LocationModel response.
  Future<LocationModel?> reverseGeocode(LatLng position) async {
    try {
      final List<Placemark> placemarks = await _geocoding
          .placemarkFromCoordinates(
            position.latitude,
            position.longitude,
          )
          .timeout(const Duration(seconds: 8));

      if (placemarks.isEmpty) {
        return LocationModel(
          latitude: position.latitude,
          longitude: position.longitude,
          formattedAddress:
              '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}',
        );
      }

      final Placemark place = placemarks.first;

      final List<String> addressParts = [];
      if (place.name != null && place.name!.isNotEmpty) {
        addressParts.add(place.name!);
      }
      if (place.subLocality != null &&
          place.subLocality!.isNotEmpty &&
          place.subLocality != place.name) {
        addressParts.add(place.subLocality!);
      }
      if (place.locality != null &&
          place.locality!.isNotEmpty &&
          place.locality != place.name &&
          place.locality != place.subLocality) {
        addressParts.add(place.locality!);
      }
      if (place.administrativeArea != null &&
          place.administrativeArea!.isNotEmpty) {
        addressParts.add(place.administrativeArea!);
      }
      if (place.country != null && place.country!.isNotEmpty) {
        addressParts.add(place.country!);
      }

      final String formattedAddress = addressParts.isNotEmpty
          ? addressParts.join(', ')
          : '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}';

      return LocationModel(
        latitude: position.latitude,
        longitude: position.longitude,
        formattedAddress: formattedAddress,
        street: place.street,
        locality: place.subLocality ?? place.locality,
        city: place.locality,
        state: place.administrativeArea,
        country: place.country,
        postalCode: place.postalCode,
      );
    } catch (_) {
      return LocationModel(
        latitude: position.latitude,
        longitude: position.longitude,
        formattedAddress:
            '${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}',
      );
    }
  }

  /// Converts an address query string into LatLng coordinates.
  Future<LatLng?> forwardGeocode(String address) async {
    try {
      final List<Location> locations = await _geocoding
          .locationFromAddress(address)
          .timeout(const Duration(seconds: 8));

      if (locations.isNotEmpty) {
        final Location loc = locations.first;
        return LatLng(loc.latitude, loc.longitude);
      }
      return null;
    } catch (_) {
      return null;
    }
  }
}
