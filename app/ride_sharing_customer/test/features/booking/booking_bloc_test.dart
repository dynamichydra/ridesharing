import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:ride_sharing_customer/features/booking/domain/entities/vehicle.dart';
import 'package:ride_sharing_customer/features/booking/domain/repositories/booking_repository.dart';
import 'package:ride_sharing_customer/features/booking/presentation/bloc/booking_bloc.dart';

class MockBookingRepository implements BookingRepository {
  @override
  Future<List<Vehicle>> getVehicles() async {
    return [
      const Vehicle(
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
  double calculateFare(double distanceMiles, Vehicle vehicle) {
    return 10.0;
  }

  @override
  Future<Map<String, dynamic>?> detectZone(double lat, double lng) async {
    return {'id': 'zone_1', 'name': 'City Zone'};
  }
}

void main() {
  late MockBookingRepository repository;

  setUp(() {
    repository = MockBookingRepository();
  });

  group('BookingBloc Tests', () {
    blocTest<BookingBloc, BookingState>(
      'emits [BookingLoading, BookingVehicleOptionsLoaded] when SetRideLocations is added',
      build: () => BookingBloc(repository),
      act: (bloc) => bloc.add(const SetRideLocations(
        pickup: LatLng(34.0, -118.0),
        pickupName: 'Pickup Point',
        pickupAddress: '123 St',
        destination: LatLng(34.01, -118.01),
        destinationName: 'Destination Point',
        destinationAddress: '456 St',
      )),
      expect: () => [
        BookingLoading(),
        isA<BookingVehicleOptionsLoaded>(),
      ],
    );

    blocTest<BookingBloc, BookingState>(
      'emits [BookingInitial] when ClearBooking is added',
      build: () => BookingBloc(repository),
      act: (bloc) => bloc.add(ClearBooking()),
      expect: () => [
        BookingInitial(),
      ],
    );
  });
}
