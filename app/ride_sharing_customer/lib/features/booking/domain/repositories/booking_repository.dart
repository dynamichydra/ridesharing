import '../entities/vehicle.dart';

abstract class BookingRepository {
  Future<List<Vehicle>> getVehicles();
  double calculateFare(double distanceMiles, Vehicle vehicle);
  Future<Map<String, dynamic>?> detectZone(double lat, double lng);
}
