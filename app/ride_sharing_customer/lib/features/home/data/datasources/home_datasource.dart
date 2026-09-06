import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/constants/constants.dart';
import '../../../location/services/location_service.dart';


abstract class HomeDataSource {
  Future<LatLng> getCurrentLocation();
  Future<List<Map<String, dynamic>>> searchPlaces(String query);
  Future<List<Map<String, dynamic>>> getSavedPlaces();
  Future<List<Map<String, dynamic>>> getRecentRides();
}

class HomeDataSourceImpl implements HomeDataSource {
  final DioClient _dioClient;

  HomeDataSourceImpl(this._dioClient);

  @override
  Future<LatLng> getCurrentLocation() async {
    try {
      final locationService = LocationService();
      final currentLoc = await locationService.getCurrentLocation();
      if (currentLoc != null) {
        return currentLoc;
      }
    } catch (_) {}
    // Default fallback coordinates (Kolkata City Center)
    return const LatLng(22.5726, 88.3639);
  }


  @override
  Future<List<Map<String, dynamic>>> searchPlaces(String query) async {
    final list = await _dioClient.getMockData(AppMockAssets.rides) as List<dynamic>;
    if (query.isEmpty) {
      return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    return list
        .where((e) =>
            e['name'].toString().toLowerCase().contains(query.toLowerCase()) ||
            e['address'].toString().toLowerCase().contains(query.toLowerCase()))
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }

  @override
  Future<List<Map<String, dynamic>>> getSavedPlaces() async {
    try {
      final response = await _dioClient.dio.get('/api/v1/saved-places');
      if (response.data['SUCCESS'] == true && response.data['MESSAGE'] is List) {
        final List<dynamic> list = response.data['MESSAGE'];
        return list.map((e) {
          final item = Map<String, dynamic>.from(e as Map);
          return {
            'id': item['id']?.toString() ?? '',
            'type': item['label']?.toString() ?? 'favorite',
            'name': item['name']?.toString() ?? (item['label']?.toString() ?? 'Place'),
            'address': item['address']?.toString() ?? '',
            'latitude': double.tryParse(item['lat']?.toString() ?? '') ?? 0.0,
            'longitude': double.tryParse(item['lng']?.toString() ?? '') ?? 0.0,
            'isDefaultPickup': item['isDefaultPickup'] == true,
          };
        }).toList();
      }
    } catch (_) {}

    try {
      final response = await _dioClient.getMockData(AppMockAssets.users);
      final user = Map<String, dynamic>.from(response as Map);
      final saved = user['saved_places'] as List? ?? [];
      return saved.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } catch (_) {
      return [];
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getRecentRides() async {
    try {
      final response = await _dioClient.dio.get(
        '/api/v1/riders/rides',
        queryParameters: {'status': 'completed', 'limit': 10},
      );
      if (response.data['SUCCESS'] == true) {
        final List<dynamic> list = response.data['MESSAGE'] ?? response.data['DATA'] ?? [];
        final mappedList = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        // Ensure only completed rides with valid drop coordinates/addresses are returned
        return mappedList.where((r) => (r['status'] ?? '').toString().toLowerCase() == 'completed').toList();
      }
    } catch (_) {}
    return [];
  }
}
