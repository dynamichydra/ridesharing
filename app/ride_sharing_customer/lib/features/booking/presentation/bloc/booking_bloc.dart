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

class ConfirmRideBooking extends BookingEvent {}

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
  final LatLng pickup;
  final String pickupName;
  final LatLng destination;
  final String destinationName;
  final Vehicle selectedVehicle;
  final double fare;

  const BookingConfirmed({
    required this.pickup,
    required this.pickupName,
    required this.destination,
    required this.destinationName,
    required this.selectedVehicle,
    required this.fare,
  });

  @override
  List<Object?> get props => [pickup, pickupName, destination, destinationName, selectedVehicle, fare];
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

      final vehiclesList = await _bookingRepository.getVehicles();
      
      final Map<String, double> fares = {};
      for (final vehicle in vehiclesList) {
        fares[vehicle.id] = _bookingRepository.calculateFare(distance, vehicle);
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
        selectedVehicle: vehiclesList.first,
      ));
    } catch (e) {
      emit(BookingError(e.toString()));
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
        await Future.delayed(const Duration(milliseconds: 1000));
        
        final selectedFare = currentState.calculatedFares[currentState.selectedVehicle.id] ?? 10.0;
        
        emit(BookingConfirmed(
          pickup: currentState.pickup,
          pickupName: currentState.pickupName,
          destination: currentState.destination,
          destinationName: currentState.destinationName,
          selectedVehicle: currentState.selectedVehicle,
          fare: selectedFare,
        ));
      } catch (e) {
        emit(BookingError(e.toString()));
      }
    }
  }

  void _onClearBooking(ClearBooking event, Emitter<BookingState> emit) {
    emit(BookingInitial());
  }
}
