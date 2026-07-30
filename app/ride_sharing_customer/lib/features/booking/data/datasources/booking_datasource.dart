import '../../../../core/network/dio_client.dart';
import '../models/vehicle_model.dart';

abstract class BookingDataSource {
  Future<List<VehicleModel>> getVehicles();
  Future<Map<String, dynamic>?> detectZone(double lat, double lng);
  Future<List<Map<String, dynamic>>> estimateAllFares({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
  });
  Future<Map<String, dynamic>> requestRide({

    required String vehicleTypeId,
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required double dropLat,
    required double dropLng,
    required String dropAddress,
  });
}


class BookingDataSourceImpl implements BookingDataSource {
  final DioClient _dioClient;

  BookingDataSourceImpl(this._dioClient);

  @override
  Future<List<VehicleModel>> getVehicles() async {
    try {
      print('[BookingDataSource] GET /api/v1/vehicle-types requesting...');
      final response = await _dioClient.dio.get('/api/v1/vehicle-types');
      print('[BookingDataSource] GET /api/v1/vehicle-types RESPONSE: ${response.statusCode} - ${response.data}');
      if (response.data['SUCCESS'] == true) {
        final List<dynamic> list = response.data['MESSAGE'];
        return list.map((e) {
          final item = Map<String, dynamic>.from(e as Map);
          return VehicleModel(
            id: item['id'] ?? '',
            name: item['name'] ?? '',
            description: item['description'] ?? 'Fast and reliable ride',
            baseFare: (item['baseRate'] ?? 0.0 as num).toDouble(),
            perMile: (item['perKmRate'] ?? 0.0 as num).toDouble(), // Maps perKmRate to perMile
            perMinute: (item['perMinRate'] ?? 0.0 as num).toDouble(),
            capacity: item['capacity'] ?? 4,
            multiplier: 1.0,
            etaMinutes: 5,
            type: item['name']?.toString().toLowerCase() ?? 'sedan',
          );
        }).toList();
      }
      return [];
    } catch (e) {
      print('[BookingDataSource] GET /api/v1/vehicle-types ERROR: $e');
      throw Exception('Failed to load vehicles from backend: $e');
    }
  }


  @override
  Future<Map<String, dynamic>?> detectZone(double lat, double lng) async {
    try {
      print('[BookingDataSource] POST /api/v1/zones/detect requesting for: lat=$lat, lng=$lng');
      final response = await _dioClient.dio.post('/api/v1/zones/detect', data: {
        'lat': lat,
        'lng': lng,
      });
      print('[BookingDataSource] POST /api/v1/zones/detect RESPONSE: ${response.statusCode} - ${response.data}');
      if (response.data['SUCCESS'] == true) {
        final data = response.data['MESSAGE'];
        if (data != null) {
          return Map<String, dynamic>.from(data as Map);
        }
      }
      return null;
    } catch (e) {
      print('[BookingDataSource] POST /api/v1/zones/detect ERROR: $e');
      return null;
    }
  }

  @override
  Future<List<Map<String, dynamic>>> estimateAllFares({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
  }) async {
    try {
      print('[BookingDataSource] POST /api/v1/fare/estimate-all requesting...');
      final response = await _dioClient.dio.post('/api/v1/fare/estimate-all', data: {
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'dropLat': dropLat,
        'dropLng': dropLng,
      });
      print('[BookingDataSource] POST /api/v1/fare/estimate-all RESPONSE: ${response.statusCode} - ${response.data}');
      if (response.data['SUCCESS'] == true) {
        final List<dynamic> list = response.data['MESSAGE'] ?? [];
        return list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } catch (e) {
      print('[BookingDataSource] POST /api/v1/fare/estimate-all ERROR: $e');
      throw Exception('Failed to estimate fares: $e');
    }
  }

  @override

  Future<Map<String, dynamic>> requestRide({
    required String vehicleTypeId,
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required double dropLat,
    required double dropLng,
    required String dropAddress,
  }) async {
    try {
      print('[BookingDataSource] POST /api/v1/rides requesting...');
      final response = await _dioClient.dio.post('/api/v1/rides', data: {
        'vehicleTypeId': vehicleTypeId,
        'pickupLat': pickupLat,
        'pickupLng': pickupLng,
        'pickupAddress': pickupAddress,
        'dropLat': dropLat,
        'dropLng': dropLng,
        'dropAddress': dropAddress,
      });
      print('[BookingDataSource] POST /api/v1/rides RESPONSE: ${response.statusCode} - ${response.data}');
      if (response.data['SUCCESS'] == true) {
        return Map<String, dynamic>.from(response.data['MESSAGE'] as Map);
      }
      throw Exception(response.data['MESSAGE'] ?? 'Failed to request ride');
    } catch (e) {
      print('[BookingDataSource] POST /api/v1/rides ERROR: $e');
      throw Exception('Failed to request ride: $e');
    }
  }
}
