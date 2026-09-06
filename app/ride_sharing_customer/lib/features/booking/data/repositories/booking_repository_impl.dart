import '../../domain/entities/vehicle.dart';
import '../../domain/repositories/booking_repository.dart';
import '../datasources/booking_datasource.dart';

class BookingRepositoryImpl implements BookingRepository {
  final BookingDataSource _dataSource;

  BookingRepositoryImpl(this._dataSource);

  @override
  Future<List<Vehicle>> getVehicles() async {
    return await _dataSource.getVehicles();
  }

  @override
  double calculateFare(double distanceMiles, Vehicle vehicle) {
    // Fare Formula = [Base Fare + (Distance * PricePerMile) + (Duration * PricePerMinute)] * Multiplier
    // Assume average city speed: 1 mile takes 2.5 minutes
    final durationMinutes = distanceMiles * 2.5;
    final baseCalculated = vehicle.baseFare + (distanceMiles * vehicle.perMile) + (durationMinutes * vehicle.perMinute);
    final totalFare = baseCalculated * vehicle.multiplier;
    return double.parse(totalFare.toStringAsFixed(2));
  }

  @override
  Future<Map<String, dynamic>?> detectZone(double lat, double lng) async {
    final zone = await _dataSource.detectZone(lat, lng);
    if (zone != null) return zone;

    if (lat >= 12.0 && lat <= 14.0 && lng >= 76.5 && lng <= 78.5) {
      if (lat >= 13.1 && lat <= 13.3) {
        return {
          'id': 'zone_blr_airport_mock',
          'name': 'Bengaluru Airport Zone (Fallback)',
          'type': 'airport',
          'multiplier': '1.30',
          'isActive': true,
        };
      }
      return {
        'id': 'zone_blr_mock',
        'name': 'Bengaluru (Fallback Zone)',
        'type': 'city',
        'multiplier': '1.00',
        'isActive': true,
      };
    }
    return null;
  }

  @override
  Future<List<Map<String, dynamic>>> estimateAllFares({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
  }) async {
    return await _dataSource.estimateAllFares(
      pickupLat: pickupLat,
      pickupLng: pickupLng,
      dropLat: dropLat,
      dropLng: dropLng,
    );
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
    String? promoCode,
  }) async {
    return await _dataSource.requestRide(
      vehicleTypeId: vehicleTypeId,
      pickupLat: pickupLat,
      pickupLng: pickupLng,
      pickupAddress: pickupAddress,
      dropLat: dropLat,
      dropLng: dropLng,
      dropAddress: dropAddress,
      paymentMethod: paymentMethod,
      promoCode: promoCode,
    );
  }

  @override
  Future<Map<String, dynamic>> validatePromo(String code, double fare) async {
    return await _dataSource.validatePromo(code, fare);
  }
}
