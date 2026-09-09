import 'package:flutter_test/flutter_test.dart';
import 'package:bloc_test/bloc_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:ride_sharing_customer/features/booking/domain/entities/vehicle.dart';
import 'package:ride_sharing_customer/features/booking/domain/entities/passenger_info.dart';
import 'package:ride_sharing_customer/features/booking/domain/repositories/booking_repository.dart';
import 'package:ride_sharing_customer/features/booking/presentation/bloc/booking_bloc.dart';

class MockBookingRepository implements BookingRepository {
  @override
  Future<Map<String, dynamic>> validatePromo(
    String promoCode,
    double fare, {
    String? vehicleTypeId,
    String? cityId,
    String? countryId,
  }) async {
    return <String, dynamic>{
      'code': promoCode,
      'finalFareMinor': 500, // ₹5.00
      'discountAmountMinor': 500, // ₹5.00
      'description': 'Test Promo 50% off',
    };
  }

  @override
  Future<Map<String, dynamic>> getMyReferralInfo() async {
    return {
      'referralCode': 'REF-TEST01',
      'totalReferrals': 1,
      'totalEarnedMinor': 5000,
    };
  }

  @override
  Future<Map<String, dynamic>> applyReferralCode(String referralCode) async {
    return {'status': 'pending'};
  }

  @override
  Future<List<Map<String, dynamic>>> getAvailablePromos({
    String? vehicleTypeId,
    String? cityId,
    String? countryId,
  }) async {
    return [];
  }

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

  @override
  Future<List<Map<String, dynamic>>> estimateAllFares({
    required double pickupLat,
    required double pickupLng,
    required double dropLat,
    required double dropLng,
    String? promoCode,
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
    String? promoCode,
    Map<String, dynamic>? passenger,
    String? notes,
  }) async {
    return {
      'id': 'ride_mock_id',
      'status': 'searching',
      'ride': {'id': 'ride_mock_id'},
      'passenger': passenger,
      'trackingUrl': passenger != null ? '/api/v1/public/trips/mock_token_123' : null,
    };
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

    blocTest<BookingBloc, BookingState>(
      'applies promo code and updates fare when ApplyPromoCode is added',
      build: () => BookingBloc(repository),
      seed: () => const BookingVehicleOptionsLoaded(
        pickup: LatLng(34.0, -118.0),
        pickupName: 'Pickup Point',
        pickupAddress: '123 St',
        destination: LatLng(34.01, -118.01),
        destinationName: 'Destination Point',
        destinationAddress: '456 St',
        distanceMiles: 5.0,
        vehicles: [
          Vehicle(
            id: 'veh_economy',
            name: 'Auto',
            description: 'Affordable, everyday rides',
            baseFare: 10.0,
            perMile: 1.0,
            perMinute: 0.2,
            capacity: 3,
            multiplier: 1.0,
            etaMinutes: 3,
            type: 'auto',
          ),
        ],
        calculatedFares: {'veh_economy': 10.0},
        originalFares: {'veh_economy': 10.0},
        selectedVehicle: Vehicle(
          id: 'veh_economy',
          name: 'Auto',
          description: 'Affordable, everyday rides',
          baseFare: 10.0,
          perMile: 1.0,
          perMinute: 0.2,
          capacity: 3,
          multiplier: 1.0,
          etaMinutes: 3,
          type: 'auto',
        ),
      ),
      act: (bloc) => bloc.add(const ApplyPromoCode('WELCOME50')),
      expect: () => [
        isA<BookingVehicleOptionsLoaded>()
            .having((s) => s.appliedPromoCode, 'appliedPromoCode', 'WELCOME50')
            .having((s) => s.discountAmount, 'discountAmount', 5.0)
            .having((s) => s.calculatedFares['veh_economy'], 'discountedFare', 5.0),
      ],
    );

    blocTest<BookingBloc, BookingState>(
      'removes promo code and restores original fare when RemovePromoCode is added',
      build: () => BookingBloc(repository),
      seed: () => const BookingVehicleOptionsLoaded(
        pickup: const LatLng(34.0, -118.0),
        pickupName: 'Pickup Point',
        pickupAddress: '123 St',
        destination: const LatLng(34.01, -118.01),
        destinationName: 'Destination Point',
        destinationAddress: '456 St',
        distanceMiles: 5.0,
        vehicles: const [
          Vehicle(
            id: 'veh_economy',
            name: 'Auto',
            description: 'Affordable, everyday rides',
            baseFare: 10.0,
            perMile: 1.0,
            perMinute: 0.2,
            capacity: 3,
            multiplier: 1.0,
            etaMinutes: 3,
            type: 'auto',
          ),
        ],
        calculatedFares: const {'veh_economy': 5.0},
        originalFares: const {'veh_economy': 10.0},
        selectedVehicle: const Vehicle(
          id: 'veh_economy',
          name: 'Auto',
          description: 'Affordable, everyday rides',
          baseFare: 10.0,
          perMile: 1.0,
          perMinute: 0.2,
          capacity: 3,
          multiplier: 1.0,
          etaMinutes: 3,
          type: 'auto',
        ),
        appliedPromoCode: 'WELCOME50',
        discountAmount: 5.0,
      ),
      act: (bloc) => bloc.add(RemovePromoCode()),
      expect: () => [
        isA<BookingVehicleOptionsLoaded>()
            .having((s) => s.appliedPromoCode, 'appliedPromoCode', isNull)
            .having((s) => s.discountAmount, 'discountAmount', isNull)
            .having((s) => s.calculatedFares['veh_economy'], 'restoredFare', 10.0),
      ],
    );

    blocTest<BookingBloc, BookingState>(
      'confirms booking on behalf of someone else with passenger and trackingUrl',
      build: () => BookingBloc(repository),
      seed: () => const BookingVehicleOptionsLoaded(
        pickup: LatLng(34.0, -118.0),
        pickupName: 'Pickup Point',
        pickupAddress: '123 St',
        destination: LatLng(34.01, -118.01),
        destinationName: 'Destination Point',
        destinationAddress: '456 St',
        distanceMiles: 5.0,
        vehicles: [
          Vehicle(
            id: 'veh_economy',
            name: 'Auto',
            description: 'Affordable, everyday rides',
            baseFare: 10.0,
            perMile: 1.0,
            perMinute: 0.2,
            capacity: 3,
            multiplier: 1.0,
            etaMinutes: 3,
            type: 'auto',
          ),
        ],
        calculatedFares: {'veh_economy': 10.0},
        originalFares: {'veh_economy': 10.0},
        selectedVehicle: Vehicle(
          id: 'veh_economy',
          name: 'Auto',
          description: 'Affordable, everyday rides',
          baseFare: 10.0,
          perMile: 1.0,
          perMinute: 0.2,
          capacity: 3,
          multiplier: 1.0,
          etaMinutes: 3,
          type: 'auto',
        ),
      ),
      act: (bloc) => bloc.add(ConfirmRideBooking(
        paymentMethod: 'cash',
        passenger: const PassengerInfo(
          name: 'Sarah Connor',
          phoneNumber: '9876543210',
          phoneCountryCode: '+91',
          email: 'sarah.connor@example.com',
          passengerType: 'family',
        ),
        notes: 'Please help with luggage',
      )),
      expect: () => [
        BookingLoading(),
        isA<BookingConfirmed>()
            .having((s) => s.rideId, 'rideId', 'ride_mock_id')
            .having((s) => s.passenger?.name, 'passenger.name', 'Sarah Connor')
            .having((s) => s.passenger?.phoneNumber, 'passenger.phoneNumber', '9876543210')
            .having((s) => s.passenger?.passengerType, 'passenger.passengerType', 'family')
            .having((s) => s.trackingUrl, 'trackingUrl', '/api/v1/public/trips/mock_token_123')
            .having((s) => s.notes, 'notes', 'Please help with luggage'),
      ],
    );
  });
}
