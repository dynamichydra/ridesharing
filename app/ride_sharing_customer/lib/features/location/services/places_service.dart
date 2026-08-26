import 'dart:ui' as ui;
import 'package:dio/dio.dart';
import 'package:flutter_google_places_sdk/flutter_google_places_sdk.dart'
    hide LatLng;
import 'package:google_maps_flutter/google_maps_flutter.dart';
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
  Future<LocationModel?> getPlaceLocationModel(String placeId) async {
    final Place? place = await fetchPlaceDetails(placeId);
    if (place == null || place.latLng == null) return null;

    return LocationModel(
      latitude: place.latLng!.lat,
      longitude: place.latLng!.lng,
      formattedAddress: place.address ?? place.name ?? '',
      placeId: place.id ?? placeId,
    );
  }

  /// Converts a Place ID into LatLng coordinates.
  Future<LatLng?> getLatLngFromPlaceId(String placeId) async {
    final Place? place = await fetchPlaceDetails(placeId);
    if (place == null || place.latLng == null) return null;
    return LatLng(place.latLng!.lat, place.latLng!.lng);
  }

  /// Fetches autocomplete predictions via the Google Places REST API.
  /// Reliable fallback when the native SDK returns empty results.
  Future<List<Map<String, dynamic>>> fetchPredictionsHttp(
    String query,
    String apiKey,
  ) async {
    if (query.trim().isEmpty || apiKey.isEmpty) return [];

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 8),
        receiveTimeout: const Duration(seconds: 8),
      ));
      final response = await dio.get<Map<String, dynamic>>(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        queryParameters: {
          'input': query,
          'key': apiKey,
        },
      );

      final data = response.data;
      if (data == null || data['status'] != 'OK') return [];

      final predictions = data['predictions'] as List<dynamic>? ?? [];
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
    } catch (_) {
      return [];
    }
  }
}
