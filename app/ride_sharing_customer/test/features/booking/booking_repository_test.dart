import 'package:flutter_test/flutter_test.dart';
import 'package:ride_sharing_customer/features/booking/data/repositories/booking_repository_impl.dart';
import 'package:ride_sharing_customer/features/booking/data/datasources/booking_datasource.dart';
import 'package:ride_sharing_customer/features/booking/data/models/vehicle_model.dart';
import 'package:ride_sharing_customer/features/booking/domain/entities/vehicle.dart';

class MockBookingDataSource implements BookingDataSource {
  @override
  Future<List<VehicleModel>> getVehicles() async {
    return [
      const VehicleModel(
        id: 'veh_economy',
        name: 'Auto',
        description: 'Affordable, everyday rides',
        baseFare: 2.50,
        perMile: 1.10,
        perMinute: 0.20,
        capacity: 4,
        multiplier: 1.0,
        etaMinutes: 3,
        type: 'economy',
      ),
    ];
  }

  @override
  Future<Map<String, dynamic>?> detectZone(double lat, double lng) async {
    return {'id': 'zone_1', 'name': 'City Zone'};
  }

  @override
  Future<List<Map<String, dynamic>>> estimateAllFares({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
  }) async {
    return [
      {
        'vehicleTypeId': 'veh_economy',
        'vehicleTypeName': 'Auto',
        'estimatedFareMinor': 1000,
        'distanceKm': 5.0,
        'durationMin': 15,
      }
    ];
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
    String paymentMethod = 'cash',
  }) async {
    return {'id': 'ride_mock_id', 'status': 'searching'};
  }
}



void main() {
  group('BookingRepositoryImpl Tests', () {
    test('calculateFare returns correct mathematical price', () {
      final datasource = MockBookingDataSource();
      final repository = BookingRepositoryImpl(datasource);

      const vehicle = Vehicle(
        id: 'veh_economy',
        name: 'Auto',
        description: 'Affordable, everyday rides',
        baseFare: 2.50,
        perMile: 1.10,
        perMinute: 0.20,
        capacity: 4,
        multiplier: 1.0,
        etaMinutes: 3,
        type: 'economy',
      );

      // Distance: 10.0 miles
      // Duration = 10.0 * 2.5 = 25 minutes
      // Base calculated = 2.50 + (10.0 * 1.10) + (25 * 0.20)
      //                 = 2.50 + 11.00 + 5.00 = 18.50
      // Multiplier = 1.0
      // Total = 18.50
      final result = repository.calculateFare(10.0, vehicle);
      expect(result, 18.50);
    });
  });
}
