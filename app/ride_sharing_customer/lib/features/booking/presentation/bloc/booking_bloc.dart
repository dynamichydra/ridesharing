import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/utils/location_helper.dart';
import '../../domain/entities/vehicle.dart';
import '../../domain/repositories/booking_repository.dart';

// ==========================================
// Booking Events
// ==========================================
abstract class BookingEvent extends Equatable {
  const BookingEvent();

  @override
  List<Object?> get props => [];
}

class SetRideLocations extends BookingEvent {
  final LatLng pickup;
  final String pickupName;
  final String pickupAddress;
  final LatLng destination;
  final String destinationName;
  final String destinationAddress;

  const SetRideLocations({
    required this.pickup,
    required this.pickupName,
    required this.pickupAddress,
    required this.destination,
    required this.destinationName,
    required this.destinationAddress,
  });

  @override
  List<Object?> get props => [
        pickup,
        pickupName,
        pickupAddress,
        destination,
        destinationName,
        destinationAddress,
      ];
}

class SelectVehicle extends BookingEvent {
  final Vehicle vehicle;

  const SelectVehicle(this.vehicle);

  @override
  List<Object?> get props => [vehicle];
}

class ConfirmRideBooking extends BookingEvent {
  final String paymentMethod;
  const ConfirmRideBooking({this.paymentMethod = 'cash'});

  @override
  List<Object?> get props => [paymentMethod];
}

class ClearBooking extends BookingEvent {}

// ==========================================
// Booking States
// ==========================================
abstract class BookingState extends Equatable {
  const BookingState();

  @override
  List<Object?> get props => [];
}

class BookingInitial extends BookingState {}

class BookingLoading extends BookingState {}

class BookingVehicleOptionsLoaded extends BookingState {
  final LatLng pickup;
  final String pickupName;
  final String pickupAddress;
  final LatLng destination;
  final String destinationName;
  final String destinationAddress;
  final double distanceMiles;
  final List<Vehicle> vehicles;
  final Map<String, double> calculatedFares;
  final Vehicle selectedVehicle;

  const BookingVehicleOptionsLoaded({
    required this.pickup,
    required this.pickupName,
    required this.pickupAddress,
    required this.destination,
    required this.destinationName,
    required this.destinationAddress,
    required this.distanceMiles,
    required this.vehicles,
    required this.calculatedFares,
    required this.selectedVehicle,
  });

  BookingVehicleOptionsLoaded copyWith({
    Vehicle? selectedVehicle,
  }) {
    return BookingVehicleOptionsLoaded(
      pickup: pickup,
      pickupName: pickupName,
      pickupAddress: pickupAddress,
      destination: destination,
      destinationName: destinationName,
      destinationAddress: destinationAddress,
      distanceMiles: distanceMiles,
      vehicles: vehicles,
      calculatedFares: calculatedFares,
      selectedVehicle: selectedVehicle ?? this.selectedVehicle,
    );
  }

  @override
  List<Object?> get props => [
        pickup,
        pickupName,
        pickupAddress,
        destination,
        destinationName,
        destinationAddress,
        distanceMiles,
        vehicles,
        calculatedFares,
        selectedVehicle,
      ];
}

class BookingConfirmed extends BookingState {
  final String rideId;
  final LatLng pickup;
  final String pickupName;
  final LatLng destination;
  final String destinationName;
  final Vehicle selectedVehicle;
  final double fare;
  final String paymentMethod;

  const BookingConfirmed({
    required this.rideId,
    required this.pickup,
    required this.pickupName,
    required this.destination,
    required this.destinationName,
    required this.selectedVehicle,
    required this.fare,
    this.paymentMethod = 'cash',
  });

  @override
  List<Object?> get props => [rideId, pickup, pickupName, destination, destinationName, selectedVehicle, fare, paymentMethod];
}


class BookingError extends BookingState {
  final String message;

  const BookingError(this.message);

  @override
  List<Object?> get props => [message];
}

// ==========================================
// Booking BLoC
// ==========================================
class BookingBloc extends Bloc<BookingEvent, BookingState> {
  final BookingRepository _bookingRepository;

  BookingBloc(this._bookingRepository) : super(BookingInitial()) {
    on<SetRideLocations>(_onSetRideLocations);
    on<SelectVehicle>(_onSelectVehicle);
    on<ConfirmRideBooking>(_onConfirmRideBooking);
    on<ClearBooking>(_onClearBooking);
  }

  Future<void> _onSetRideLocations(SetRideLocations event, Emitter<BookingState> emit) async {
    emit(BookingLoading());
    try {
      final distance = LocationHelper.calculateDistance(
        event.pickup.latitude,
        event.pickup.longitude,
        event.destination.latitude,
        event.destination.longitude,
      );


      print('[BookingBloc] Fetching server fare estimates...');
      final estimates = await _bookingRepository.estimateAllFares(
        pickupLat: event.pickup.latitude,
        pickupLng: event.pickup.longitude,
        dropLat: event.destination.latitude,
        dropLng: event.destination.longitude,
      );
      print('[BookingBloc] Server estimates: $estimates');

      if (estimates.isEmpty) {
        throw Exception("No rides are currently available for this route.");
      }

      final List<Vehicle> vehiclesList = [];
      final Map<String, double> fares = {};

      for (final est in estimates) {
        final String typeId = est['vehicleTypeId']?.toString() ?? '';
        final String name = est['vehicleTypeName']?.toString() ?? 'Ride';
        final int estimatedFareMinor = est['estimatedFareMinor'] as int? ?? 0;
        final double fareValue = estimatedFareMinor / 100.0;
        
        final double distKm = double.tryParse(est['distanceKm']?.toString() ?? '0.0') ?? 0.0;
        final int durationMin = est['durationMin'] as int? ?? 0;

        final vehicle = Vehicle(
          id: typeId,
          name: name,
          description: '${distKm.toStringAsFixed(1)} km • ${durationMin} mins',
          baseFare: fareValue,
          perMile: 0,
          perMinute: 0,
          capacity: name.toLowerCase().contains('bike') || name.toLowerCase().contains('moto') ? 1 : 4,
          multiplier: 1.0,
          etaMinutes: 5,
          type: name.toLowerCase().contains('bike') || name.toLowerCase().contains('moto') ? 'bike' : 'sedan',
        );

        vehiclesList.add(vehicle);
        fares[typeId] = fareValue;
      }

      emit(BookingVehicleOptionsLoaded(
        pickup: event.pickup,
        pickupName: event.pickupName,
        pickupAddress: event.pickupAddress,
        destination: event.destination,
        destinationName: event.destinationName,
        destinationAddress: event.destinationAddress,
        distanceMiles: distance,
        vehicles: vehiclesList,
        calculatedFares: fares,
        selectedVehicle: vehiclesList.isNotEmpty ? vehiclesList.first : vehiclesList.first, // fallback safe
      ));

    } catch (e) {
      print('[BookingBloc] SetRideLocations failed with error: $e');
      emit(BookingError(e.toString().replaceAll('Exception: ', '')));
    }

  }

  void _onSelectVehicle(SelectVehicle event, Emitter<BookingState> emit) {
    final currentState = state;
    if (currentState is BookingVehicleOptionsLoaded) {
      emit(currentState.copyWith(selectedVehicle: event.vehicle));
    }
  }

  Future<void> _onConfirmRideBooking(ConfirmRideBooking event, Emitter<BookingState> emit) async {
    final currentState = state;
    if (currentState is BookingVehicleOptionsLoaded) {
      emit(BookingLoading());
      try {
        final selectedFare = currentState.calculatedFares[currentState.selectedVehicle.id] ?? 10.0;

        print('[BookingBloc] Confirming booking with backend requestRide...');
        final result = await _bookingRepository.requestRide(
          vehicleTypeId: currentState.selectedVehicle.id,
          pickupLat: currentState.pickup.latitude,
          pickupLng: currentState.pickup.longitude,
          pickupAddress: currentState.pickupAddress,
          dropLat: currentState.destination.latitude,
          dropLng: currentState.destination.longitude,
          dropAddress: currentState.destinationAddress,
          paymentMethod: event.paymentMethod,
        );
        print('[BookingBloc] requestRide successful: $result');
        
        final rideId = result['ride']?['id']?.toString() ?? 'fake_ride_id_${DateTime.now().millisecondsSinceEpoch}';
        
        emit(BookingConfirmed(
          rideId: rideId,
          pickup: currentState.pickup,
          pickupName: currentState.pickupName,
          destination: currentState.destination,
          destinationName: currentState.destinationName,
          selectedVehicle: currentState.selectedVehicle,
          fare: selectedFare,
          paymentMethod: event.paymentMethod,
        ));

      } catch (e) {
        print('[BookingBloc] ConfirmRideBooking failed: $e');
        emit(BookingError(e.toString().replaceAll('Exception: ', '')));
      }
    }
  }


  void _onClearBooking(ClearBooking event, Emitter<BookingState> emit) {
    emit(BookingInitial());
  }
}
