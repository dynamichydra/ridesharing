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
  double calculateFare(double distanceMiles, Vehicle vehicle) {
    // Fare Formula = [Base Fare + (Distance * PricePerMile) + (Duration * PricePerMinute)] * Multiplier
    // Assume average city speed: 1 mile takes 2.5 minutes
    final durationMinutes = distanceMiles * 2.5;
    final baseCalculated = vehicle.baseFare + (distanceMiles * vehicle.perMile) + (durationMinutes * vehicle.perMinute);
    final totalFare = baseCalculated * vehicle.multiplier;
    return double.parse(totalFare.toStringAsFixed(2));
  }
}
