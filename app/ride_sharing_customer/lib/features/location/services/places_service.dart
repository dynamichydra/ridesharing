import 'dart:ui' as ui;
import 'package:dio/dio.dart';
import 'package:flutter_google_places_sdk/flutter_google_places_sdk.dart'
    hide LatLng;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/constants/constants.dart';
import '../models/location_model.dart';

class PlacesService {
  FlutterGooglePlacesSdk? _placesSdk;
  bool _isInitialized = false;

  bool get isInitialized => _isInitialized;

  /// Initializes the Google Places SDK with an API key.
  void initialize(String apiKey, {String? locale}) {
    if (_isInitialized) return;
    try {
      final ui.Locale? localeObj =
          locale != null ? ui.Locale(locale) : null;
      _placesSdk = FlutterGooglePlacesSdk(apiKey, locale: localeObj);
      _isInitialized = true;
    } catch (_) {
      _isInitialized = false;
    }
  }

  /// Fetches autocomplete predictions for a given user query.
  Future<List<AutocompletePrediction>> fetchPredictions(
    String query, {
    List<String>? countries,
  }) async {
    if (!_isInitialized || _placesSdk == null || query.trim().isEmpty) {
      return [];
    }

    try {
      final FindAutocompletePredictionsResponse response =
          await _placesSdk!.findAutocompletePredictions(
        query,
        countries: countries,
      );

      return response.predictions;
    } catch (_) {
      return [];
    }
  }

  /// Fetches detailed information for a specific place by placeId.
  Future<Place?> fetchPlaceDetails(
    String placeId, {
    List<PlaceField>? fields,
  }) async {
    if (!_isInitialized || _placesSdk == null || placeId.trim().isEmpty) {
      return null;
    }

    try {
      final FetchPlaceResponse response = await _placesSdk!.fetchPlace(
        placeId,
        fields: fields ??
            [
              PlaceField.Location,
              PlaceField.Address,
              PlaceField.Name,
              PlaceField.AddressComponents,
              PlaceField.Id,
            ],
      );

      return response.place;
    } catch (_) {
      return null;
    }
  }

  /// Helper to fetch location model directly from a place ID lookup.
  Future<LocationModel?> getPlaceLocationModel(String placeId, {String? apiKey}) async {
    final Place? place = await fetchPlaceDetails(placeId);
    if (place != null && place.latLng != null) {
      return LocationModel(
        latitude: place.latLng!.lat,
        longitude: place.latLng!.lng,
        formattedAddress: place.address ?? place.name ?? '',
        placeId: place.id ?? placeId,
      );
    }

    if (apiKey != null && apiKey.isNotEmpty) {
      final coords = await getLatLngFromPlaceIdHttp(placeId, apiKey);
      if (coords != null) {
        return LocationModel(
          latitude: coords.latitude,
          longitude: coords.longitude,
          formattedAddress: '',
          placeId: placeId,
        );
      }
    }

    return null;
  }

  /// Converts a Place ID into LatLng coordinates.
  Future<LatLng?> getLatLngFromPlaceId(String placeId, {String? apiKey}) async {
    try {
      final Place? place = await fetchPlaceDetails(placeId);
      if (place != null && place.latLng != null) {
        return LatLng(place.latLng!.lat, place.latLng!.lng);
      }
    } catch (_) {}

    if (apiKey != null && apiKey.isNotEmpty) {
      return await getLatLngFromPlaceIdHttp(placeId, apiKey);
    }
    return null;
  }

  /// Converts a Place ID into LatLng coordinates via HTTP REST API.
  Future<LatLng?> getLatLngFromPlaceIdHttp(String placeId, String apiKey) async {
    if (placeId.trim().isEmpty || apiKey.isEmpty) return null;

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
      ));
      final response = await dio.get<Map<String, dynamic>>(
        'https://maps.googleapis.com/maps/api/place/details/json',
        queryParameters: {
          'place_id': placeId,
          'fields': 'geometry,formatted_address,name',
          'key': apiKey,
        },
      );

      final data = response.data;
      if (data == null || data['status'] != 'OK') return null;

      final location = data['result']?['geometry']?['location'];
      if (location != null && location['lat'] != null && location['lng'] != null) {
        return LatLng(
          (location['lat'] as num).toDouble(),
          (location['lng'] as num).toDouble(),
        );
      }
    } catch (_) {}
    return null;
  }

  /// Fetches autocomplete predictions via the Google Places REST API.
  /// Reliable fallback when the native SDK returns empty results or errors.
  Future<List<Map<String, dynamic>>> fetchPredictionsHttp(
    String query,
    String apiKey,
  ) async {
    if (query.trim().isEmpty || apiKey.isEmpty) return [];

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));
      final response = await dio.get<Map<String, dynamic>>(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        queryParameters: {
          'input': query,
          'key': apiKey,
        },
      );

      final data = response.data;
      if (data != null && data['status'] == 'OK') {
        final predictions = data['predictions'] as List<dynamic>? ?? [];
        if (predictions.isNotEmpty) {
          return predictions.map<Map<String, dynamic>>((pred) {
            final p = pred as Map<String, dynamic>;
            final structuredFormatting =
                p['structured_formatting'] as Map<String, dynamic>?;
            return {
              'name': structuredFormatting?['main_text'] ??
                  p['description'] ??
                  query,
              'address': p['description'] ?? '',
              'placeId': p['place_id'] ?? '',
              'type': 'place',
            };
          }).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  /// High-reliability multi-suggestion search that tries Google Places, then OpenStreetMap Nominatim.
  Future<List<Map<String, dynamic>>> searchPlacesMulti(String query) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) return [];

    // 1. Try Native Places SDK
    try {
      final sdkResults = await fetchPredictions(cleanQuery);
      if (sdkResults.isNotEmpty) {
        return sdkResults.map((p) => {
          'name': p.primaryText,
          'address': p.fullText,
          'placeId': p.placeId,
          'type': 'place',
        }).toList();
      }
    } catch (_) {}

    // 2. Try Google Places HTTP Autocomplete
    try {
      final httpResults = await fetchPredictionsHttp(cleanQuery, AppConstants.googleMapsApiKey);
      if (httpResults.isNotEmpty) {
        return httpResults;
      }
    } catch (_) {}

    // 3. Try OpenStreetMap Nominatim for rich multi-item suggestions
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
        headers: {
          'User-Agent': 'RyvaRideSharingApp/1.0',
        },
      ));

      final response = await dio.get<List<dynamic>>(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {
          'q': cleanQuery,
          'format': 'json',
          'addressdetails': '1',
          'limit': '6',
        },
      );

      if (response.data != null && response.data!.isNotEmpty) {
        return response.data!.map<Map<String, dynamic>>((item) {
          final m = Map<String, dynamic>.from(item as Map);
          final addr = m['address'] as Map<String, dynamic>? ?? {};
          final name = m['name']?.toString() ??
              addr['amenity']?.toString() ??
              addr['road']?.toString() ??
              addr['suburb']?.toString() ??
              addr['city']?.toString() ??
              cleanQuery;
          final displayName = m['display_name']?.toString() ?? name;
          final lat = double.tryParse(m['lat']?.toString() ?? '') ?? 0.0;
          final lon = double.tryParse(m['lon']?.toString() ?? '') ?? 0.0;

          return {
            'name': name,
            'address': displayName,
            'placeId': m['place_id']?.toString() ?? '',
            'latitude': lat,
            'longitude': lon,
            'type': m['type']?.toString() ?? 'place',
          };
        }).toList();
      }
    } catch (_) {}

    return [];
  }
}
