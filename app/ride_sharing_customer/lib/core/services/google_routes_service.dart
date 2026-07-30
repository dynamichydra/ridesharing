import 'dart:math';
import 'package:dio/dio.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';
import 'package:logger/logger.dart';
import '../constants/constants.dart';
import '../models/route_model.dart';

/// Service that fetches real driving routes from the Google Maps APIs.
///
/// Tries the modern Routes API v2 first, and automatically falls back
/// to the traditional Directions API v1 if the v2 API is restricted/blocked.
class GoogleRoutesService {
  static const String _routesApiUrl =
      'https://routes.googleapis.com/directions/v2:computeRoutes';

  static const String _fieldMask =
      'routes.polyline.encodedPolyline,'
      'routes.legs.distanceMeters,'
      'routes.legs.duration,'
      'routes.viewport';

  final Dio _dio;
  final Logger _logger;

  GoogleRoutesService({Dio? dio, Logger? logger})
      : _dio = dio ?? _buildDio(),
        _logger = logger ?? Logger(printer: PrettyPrinter(methodCount: 0));

  static Dio _buildDio() {
    return Dio(
      BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Content-Type': 'application/json',
        },
      ),
    );
  }

  /// Fetches a real driving route between [origin] and [destination].
  Future<RouteModel?> computeRoute(
    LatLng origin,
    LatLng destination, {
    AppTravelMode travelMode = AppTravelMode.drive,
  }) async {
    _logger.d('GoogleRoutesService: requesting route '
        '${origin.latitude},${origin.longitude} → '
        '${destination.latitude},${destination.longitude} '
        '[${travelMode.apiValue}]');

    // 1. Try modern Routes API v2 first
    try {
      final requestBody = _buildRequestBody(origin, destination, travelMode);
      final response = await _dio.post<Map<String, dynamic>>(
        _routesApiUrl,
        data: requestBody,
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': AppConstants.googleMapsApiKey,
            'X-Goog-FieldMask': _fieldMask,
          },
        ),
      );

      final route = _parseResponse(response.data, travelMode);
      if (route != null) {
        return route;
      }
    } catch (e) {
      _logger.w('GoogleRoutesService: Routes API v2 failed or restricted. Attempting traditional Directions API fallback...');
    }

    // 2. Fallback: query traditional Directions API v1
    return await _computeTraditionalRoute(origin, destination, travelMode);
  }

  // ---------------------------------------------------------------------------
  // Traditional Directions API Fallback
  // ---------------------------------------------------------------------------

  Future<RouteModel?> _computeTraditionalRoute(
    LatLng origin,
    LatLng destination,
    AppTravelMode travelMode,
  ) async {
    try {
      final mode = travelMode == AppTravelMode.drive ? 'driving' : 'twoWheeler';
      final fallbackUrl = 'https://maps.googleapis.com/maps/api/directions/json'
          '?origin=${origin.latitude},${origin.longitude}'
          '&destination=${destination.latitude},${destination.longitude}'
          '&mode=$mode'
          '&key=${AppConstants.googleMapsApiKey}';

      final response = await _dio.get<Map<String, dynamic>>(fallbackUrl);
      final data = response.data;

      if (data == null || data['status'] != 'OK') {
        _logger.e('GoogleRoutesService: traditional Directions API fallback failed. Status: ${data?['status'] ?? 'null'}');
        return null;
      }

      final routes = data['routes'] as List<dynamic>?;
      if (routes == null || routes.isEmpty) return null;

      final route = routes.first as Map<String, dynamic>;
      final overviewPolyline = route['overview_polyline'] as Map<String, dynamic>?;
      final encoded = overviewPolyline?['points'] as String?;

      if (encoded == null || encoded.isEmpty) return null;

      final decoded = decodePolyline(encoded);
      final points = decoded
          .map((p) => LatLng(p[0].toDouble(), p[1].toDouble()))
          .toList();

      int totalDistance = 0;
      int totalDuration = 0;
      final legs = route['legs'] as List<dynamic>?;
      if (legs != null && legs.isNotEmpty) {
        for (final leg in legs) {
          final legMap = leg as Map<String, dynamic>;
          totalDistance += (legMap['distance']?['value'] as num?)?.toInt() ?? 0;
          totalDuration += (legMap['duration']?['value'] as num?)?.toInt() ?? 0;
        }
      }

      final bounds = _computeBoundsFromPoints(points);

      return RouteModel(
        encodedPolyline: encoded,
        decodedPoints: points,
        distanceMeters: totalDistance,
        formattedDistance: _formatDistance(totalDistance),
        durationSeconds: totalDuration,
        formattedDuration: _formatDuration(totalDuration),
        travelMode: travelMode,
        bounds: bounds,
      );
    } catch (e, st) {
      _logger.e('GoogleRoutesService: traditional Directions API failed', error: e, stackTrace: st);
      return null;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  Map<String, dynamic> _buildRequestBody(
    LatLng origin,
    LatLng destination,
    AppTravelMode travelMode,
  ) {
    return {
      'origin': {
        'location': {
          'latLng': {
            'latitude': origin.latitude,
            'longitude': origin.longitude,
          },
        },
      },
      'destination': {
        'location': {
          'latLng': {
            'latitude': destination.latitude,
            'longitude': destination.longitude,
          },
        },
      },
      'travelMode': travelMode.apiValue,
      'routingPreference': travelMode == AppTravelMode.drive
          ? 'TRAFFIC_AWARE'
          : 'ROUTING_PREFERENCE_UNSPECIFIED',
      'computeAlternativeRoutes': false,
      'languageCode': 'en-US',
      'units': 'METRIC',
    };
  }

  RouteModel? _parseResponse(
    Map<String, dynamic>? data,
    AppTravelMode travelMode,
  ) {
    if (data == null) return null;

    final routes = data['routes'] as List<dynamic>?;
    if (routes == null || routes.isEmpty) return null;

    final route = routes.first as Map<String, dynamic>;
    final polylineData = route['polyline'] as Map<String, dynamic>?;
    final encoded = polylineData?['encodedPolyline'] as String?;
    if (encoded == null || encoded.isEmpty) return null;

    final decoded = decodePolyline(encoded);
    final points = decoded
        .map((p) => LatLng(p[0].toDouble(), p[1].toDouble()))
        .toList();

    if (points.isEmpty) return null;

    int totalDistance = 0;
    int totalDuration = 0;
    final legs = route['legs'] as List<dynamic>?;
    if (legs != null && legs.isNotEmpty) {
      for (final leg in legs) {
        final legMap = leg as Map<String, dynamic>;
        totalDistance += (legMap['distanceMeters'] as num?)?.toInt() ?? 0;
        final durationStr = legMap['duration'] as String?;
        if (durationStr != null) {
          totalDuration += _parseDurationSeconds(durationStr);
        }
      }
    }

    LatLngBounds? bounds;
    final viewport = route['viewport'] as Map<String, dynamic>?;
    if (viewport != null) {
      final low = viewport['low'] as Map<String, dynamic>?;
      final high = viewport['high'] as Map<String, dynamic>?;
      if (low != null && high != null) {
        bounds = LatLngBounds(
          southwest: LatLng(
            (low['latitude'] as num).toDouble(),
            (low['longitude'] as num).toDouble(),
          ),
          northeast: LatLng(
            (high['latitude'] as num).toDouble(),
            (high['longitude'] as num).toDouble(),
          ),
        );
      }
    }

    bounds ??= _computeBoundsFromPoints(points);

    return RouteModel(
      encodedPolyline: encoded,
      decodedPoints: points,
      distanceMeters: totalDistance,
      formattedDistance: _formatDistance(totalDistance),
      durationSeconds: totalDuration,
      formattedDuration: _formatDuration(totalDuration),
      travelMode: travelMode,
      bounds: bounds,
    );
  }

  int _parseDurationSeconds(String durationStr) {
    final clean = durationStr.replaceAll('s', '').trim();
    return int.tryParse(clean) ?? 0;
  }

  String _formatDistance(int meters) {
    if (meters <= 0) return 'N/A';
    if (meters < 1000) return '${meters}m';
    final km = meters / 1000.0;
    return '${km.toStringAsFixed(1)} km';
  }

  String _formatDuration(int seconds) {
    if (seconds <= 0) return 'N/A';
    final minutes = (seconds / 60).round();
    if (minutes < 60) return '$minutes min';
    final hours = minutes ~/ 60;
    final remainingMinutes = minutes % 60;
    if (remainingMinutes == 0) return '${hours}h';
    return '${hours}h ${remainingMinutes}min';
  }

  LatLngBounds _computeBoundsFromPoints(List<LatLng> points) {
    double minLat = points.first.latitude;
    double maxLat = points.first.latitude;
    double minLng = points.first.longitude;
    double maxLng = points.first.longitude;

    for (final p in points) {
      minLat = min(minLat, p.latitude);
      maxLat = max(maxLat, p.latitude);
      minLng = min(minLng, p.longitude);
      maxLng = max(maxLng, p.longitude);
    }

    return LatLngBounds(
      southwest: LatLng(minLat, minLng),
      northeast: LatLng(maxLat, maxLng),
    );
  }
}
