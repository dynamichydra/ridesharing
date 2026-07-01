import '../../../../core/network/dio_client.dart';
import '../models/vehicle_model.dart';

abstract class BookingDataSource {
  Future<List<VehicleModel>> getVehicles();
}

class BookingDataSourceImpl implements BookingDataSource {
  final DioClient _dioClient;

  BookingDataSourceImpl(this._dioClient);

  @override
  Future<List<VehicleModel>> getVehicles() async {
    try {
      final response = await _dioClient.dio.get('/api/v1/vehicle-types');
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
      throw Exception('Failed to load vehicles from backend: $e');
    }
  }
}

