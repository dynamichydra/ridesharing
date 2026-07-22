import '../../domain/entities/vehicle.dart';
import '../../domain/repositories/booking_repository.dart';
import '../datasources/booking_datasource.dart';
import '../../../../core/errors/failures.dart';

class BookingRepositoryImpl implements BookingRepository {
  final BookingDataSource _bookingDataSource;

  BookingRepositoryImpl(this._bookingDataSource);

  @override
  Future<List<Vehicle>> getVehicles() async {
    try {
      return await _bookingDataSource.getVehicles();
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<Map<String, dynamic>?> detectZone(double lat, double lng) async {
    try {
      final zone = await _bookingDataSource.detectZone(lat, lng);
      if (zone != null) return zone;

      // Bengaluru testing fallback
      if (lat >= 12.0 && lat <= 14.0 && lng >= 76.5 && lng <= 78.5) {
        // If near Bengaluru airport location
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
    } catch (_) {
      return null;
    }
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
}
