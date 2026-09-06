import '../entities/vehicle.dart';

abstract class BookingRepository {
  Future<List<Vehicle>> getVehicles();
  double calculateFare(double distanceMiles, Vehicle vehicle);
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
    String paymentMethod = 'cash',
    String? promoCode,
  });
  Future<Map<String, dynamic>> validatePromo(String code, double fare);
}

