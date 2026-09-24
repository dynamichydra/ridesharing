import 'dart:ui' as ui;
import 'package:dio/dio.dart';
import 'package:flutter_google_places_sdk/flutter_google_places_sdk.dart'
    hide LatLng;
import 'package:flutter_google_places_sdk_platform_interface/flutter_google_places_sdk_platform_interface.dart'
    as sdk show LatLng, LatLngBounds;
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/constants/constants.dart';
import '../models/location_model.dart';

class PlaceDetails {
  final String placeId;
  final String name;
  final String address;
  final double latitude;
  final double longitude;

  PlaceDetails({
    required this.placeId,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  Map<String, dynamic> toJson() => {
        'placeId': placeId,
        'name': name,
        'address': address,
        'latitude': latitude,
        'longitude': longitude,
      };
}

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
  /// Passes [userLocation] as a location bias bounding box to prioritize nearby results.
  Future<List<AutocompletePrediction>> fetchPredictions(
    String query, {
    List<String>? countries,
    LatLng? userLocation,
  }) async {
    if (!_isInitialized || _placesSdk == null || query.trim().isEmpty) {
      return [];
    }

    try {
      // Build a ~50 km bounding box around the user's GPS location for bias.
      sdk.LatLngBounds? locationBias;
      if (userLocation != null) {
        const delta = 0.45; // ~50 km
        locationBias = sdk.LatLngBounds(
          southwest: sdk.LatLng(
            lat: userLocation.latitude - delta,
            lng: userLocation.longitude - delta,
          ),
          northeast: sdk.LatLng(
            lat: userLocation.latitude + delta,
            lng: userLocation.longitude + delta,
          ),
        );
      }

      final FindAutocompletePredictionsResponse response =
          await _placesSdk!.findAutocompletePredictions(
        query,
        countries: countries,
        locationBias: locationBias,
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

  /// Fetches complete PlaceDetails (placeId, name, address, latitude, longitude)
  Future<PlaceDetails?> getPlaceDetails(
    String placeId, {
    String? apiKey,
  }) async {
    if (placeId.trim().isEmpty) return null;
    final key = apiKey ?? AppConstants.googleMapsApiKey;

    // 1. Try Native SDK
    try {
      final Place? place = await fetchPlaceDetails(placeId);
      if (place != null && place.latLng != null) {
        return PlaceDetails(
          placeId: place.id ?? placeId,
          name: place.name ?? '',
          address: place.address ?? place.name ?? '',
          latitude: place.latLng!.lat,
          longitude: place.latLng!.lng,
        );
      }
    } catch (_) {}

    // 2. Try HTTP Place Details API
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 6),
        receiveTimeout: const Duration(seconds: 6),
      ));
      final response = await dio.get<Map<String, dynamic>>(
        'https://maps.googleapis.com/maps/api/place/details/json',
        queryParameters: {
          'place_id': placeId,
          'fields': 'place_id,name,formatted_address,geometry',
          'key': key,
        },
      );

      final data = response.data;
      if (data != null && data['status'] == 'OK' && data['result'] != null) {
        final res = data['result'] as Map<String, dynamic>;
        final loc = res['geometry']?['location'];
        if (loc != null && loc['lat'] != null && loc['lng'] != null) {
          return PlaceDetails(
            placeId: (res['place_id'] as String?) ?? placeId,
            name: (res['name'] as String?) ?? '',
            address: (res['formatted_address'] as String?) ?? '',
            latitude: (loc['lat'] as num).toDouble(),
            longitude: (loc['lng'] as num).toDouble(),
          );
        }
      }
    } catch (_) {}

    return null;
  }

  /// Helper to fetch location model directly from a place ID lookup.
  Future<LocationModel?> getPlaceLocationModel(String placeId, {String? apiKey}) async {
    final PlaceDetails? details = await getPlaceDetails(placeId, apiKey: apiKey);
    if (details != null) {
      return LocationModel(
        latitude: details.latitude,
        longitude: details.longitude,
        formattedAddress: details.address.isNotEmpty ? details.address : details.name,
        placeId: details.placeId,
      );
    }

    return null;
  }

  /// Converts a Place ID into LatLng coordinates.
  Future<LatLng?> getLatLngFromPlaceId(String placeId, {String? apiKey}) async {
    final PlaceDetails? details = await getPlaceDetails(placeId, apiKey: apiKey);
    if (details != null) {
      return LatLng(details.latitude, details.longitude);
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
  /// Uses location biasing with current device GPS lat/lng.
  Future<List<Map<String, dynamic>>> fetchPredictionsHttp(
    String query,
    String apiKey, {
    LatLng? userLocation,
    String? regionCode,
  }) async {
    if (query.trim().isEmpty || apiKey.isEmpty) return [];

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 4),
        receiveTimeout: const Duration(seconds: 4),
      ));

      final Map<String, dynamic> queryParameters = {
        'input': query,
        'key': apiKey,
      };

      if (regionCode != null && regionCode.isNotEmpty) {
        queryParameters['components'] = 'country:${regionCode.toLowerCase()}';
        queryParameters['region'] = regionCode.toLowerCase();
      }

      if (userLocation != null) {
        queryParameters['location'] = '${userLocation.latitude},${userLocation.longitude}';
        queryParameters['radius'] = '50000'; // 50km
        queryParameters['locationbias'] = 'circle:50000@${userLocation.latitude},${userLocation.longitude}';
      }

      final response = await dio.get<Map<String, dynamic>>(
        'https://maps.googleapis.com/maps/api/place/autocomplete/json',
        queryParameters: queryParameters,
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

  /// High-reliability multi-suggestion search using Google Places centered on user device GPS location.
  Future<List<Map<String, dynamic>>> searchPlacesMulti(
    String query, {
    LatLng? userLocation,
    String? regionCode,
  }) async {
    final cleanQuery = query.trim();
    if (cleanQuery.isEmpty) return [];

    final countries = (regionCode != null && regionCode.isNotEmpty)
        ? [regionCode.toLowerCase()]
        : null;

    // 1. Try Native Places SDK
    try {
      final sdkResults = await fetchPredictions(
        cleanQuery,
        countries: countries,
        userLocation: userLocation,
      );
      if (sdkResults.isNotEmpty) {
        return sdkResults.map((p) => {
          'name': p.primaryText,
          'address': p.fullText,
          'placeId': p.placeId,
          'type': 'place',
        }).toList();
      }
    } catch (_) {}

    // 2. Try Google Places HTTP Autocomplete with device location bias
    try {
      final httpResults = await fetchPredictionsHttp(
        cleanQuery,
        AppConstants.googleMapsApiKey,
        userLocation: userLocation,
        regionCode: regionCode,
      );
      if (httpResults.isNotEmpty) {
        return httpResults;
      }
    } catch (_) {}

    // 3. Try OpenStreetMap Nominatim for fallback suggestions with viewbox bias
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 5),
        receiveTimeout: const Duration(seconds: 5),
        headers: {
          'User-Agent': 'RyvaRideSharingApp/1.0',
        },
      ));

      final Map<String, dynamic> params = {
        'q': cleanQuery,
        'format': 'json',
        'addressdetails': '1',
        'limit': '6',
      };

      if (regionCode != null && regionCode.isNotEmpty) {
        params['countrycodes'] = regionCode.toLowerCase();
      }

      if (userLocation != null) {
        const delta = 0.5; // ~50km bounding box
        params['viewbox'] =
            '${userLocation.longitude - delta},${userLocation.latitude + delta},${userLocation.longitude + delta},${userLocation.latitude - delta}';
        params['bounded'] = '0';
      }

      final response = await dio.get<List<dynamic>>(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: params,
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
