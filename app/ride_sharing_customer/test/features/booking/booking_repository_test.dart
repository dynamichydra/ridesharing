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
