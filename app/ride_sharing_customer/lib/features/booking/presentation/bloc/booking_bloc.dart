import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/utils/location_helper.dart';
import '../../domain/entities/vehicle.dart';
import '../../domain/entities/passenger_info.dart';
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
  final PassengerInfo? passenger;
  final String? notes;

  const ConfirmRideBooking({
    this.paymentMethod = 'cash',
    this.passenger,
    this.notes,
  });

  @override
  List<Object?> get props => [paymentMethod, passenger, notes];
}

class ApplyPromoCode extends BookingEvent {
  final String promoCode;
  const ApplyPromoCode(this.promoCode);

  @override
  List<Object?> get props => [promoCode];
}

class RemovePromoCode extends BookingEvent {}

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
  final Map<String, double>? originalFares;
  final Vehicle selectedVehicle;
  final String? appliedPromoCode;
  final double? discountAmount;
  final String? promoDescription;

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
    this.originalFares,
    this.appliedPromoCode,
    this.discountAmount,
    this.promoDescription,
  });

  BookingVehicleOptionsLoaded copyWith({
    Vehicle? selectedVehicle,
    Map<String, double>? calculatedFares,
    Map<String, double>? originalFares,
    String? appliedPromoCode,
    double? discountAmount,
    String? promoDescription,
    bool clearPromo = false,
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
      calculatedFares: calculatedFares ?? this.calculatedFares,
      originalFares: originalFares ?? this.originalFares,
      selectedVehicle: selectedVehicle ?? this.selectedVehicle,
      appliedPromoCode: clearPromo ? null : (appliedPromoCode ?? this.appliedPromoCode),
      discountAmount: clearPromo ? null : (discountAmount ?? this.discountAmount),
      promoDescription: clearPromo ? null : (promoDescription ?? this.promoDescription),
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
        originalFares,
        selectedVehicle,
        appliedPromoCode,
        discountAmount,
        promoDescription,
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
  final PassengerInfo? passenger;
  final String? trackingUrl;
  final String? notes;

  const BookingConfirmed({
    required this.rideId,
    required this.pickup,
    required this.pickupName,
    required this.destination,
    required this.destinationName,
    required this.selectedVehicle,
    required this.fare,
    this.paymentMethod = 'cash',
    this.passenger,
    this.trackingUrl,
    this.notes,
  });

  @override
  List<Object?> get props => [
        rideId,
        pickup,
        pickupName,
        destination,
        destinationName,
        selectedVehicle,
        fare,
        paymentMethod,
        passenger,
        trackingUrl,
        notes,
      ];
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
    on<ApplyPromoCode>(_onApplyPromoCode);
    on<RemovePromoCode>(_onRemovePromoCode);
    on<ClearBooking>(_onClearBooking);
  }

  Future<void> _onApplyPromoCode(ApplyPromoCode event, Emitter<BookingState> emit) async {
    final currentState = state;
    if (currentState is BookingVehicleOptionsLoaded) {
      try {
        final originalFares = currentState.originalFares ?? Map<String, double>.from(currentState.calculatedFares);
        final selectedFare = originalFares[currentState.selectedVehicle.id] ?? currentState.selectedVehicle.baseFare;

        final result = await _bookingRepository.validatePromo(
          event.promoCode,
          selectedFare,
          vehicleTypeId: currentState.selectedVehicle.id,
        );

        final double finalFare = (result['finalFareMinor'] as int) / 100.0;
        final double discountAmount = (result['discountAmountMinor'] as int) / 100.0;
        final String? description = result['description'] as String?;

        final newFares = Map<String, double>.from(originalFares);
        newFares[currentState.selectedVehicle.id] = finalFare;

        emit(currentState.copyWith(
          calculatedFares: newFares,
          originalFares: originalFares,
          appliedPromoCode: result['code']?.toString() ?? event.promoCode.trim().toUpperCase(),
          discountAmount: discountAmount,
          promoDescription: description,
        ));
      } catch (e) {
        emit(BookingError(e.toString().replaceAll('Exception: ', '')));
        // Revert state back so error isn't permanent, allowing retry
        emit(currentState);
      }
    }
  }

  void _onRemovePromoCode(RemovePromoCode event, Emitter<BookingState> emit) {
    final currentState = state;
    if (currentState is BookingVehicleOptionsLoaded) {
      final restoredFares = currentState.originalFares != null
          ? Map<String, double>.from(currentState.originalFares!)
          : Map<String, double>.from(currentState.calculatedFares);

      emit(currentState.copyWith(
        calculatedFares: restoredFares,
        clearPromo: true,
      ));
    }
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
        originalFares: Map<String, double>.from(fares),
        selectedVehicle: vehiclesList.isNotEmpty ? vehiclesList.first : vehiclesList.first, // fallback safe
      ));

    } catch (e) {
      print('[BookingBloc] SetRideLocations failed with error: $e');
      emit(BookingError(e.toString().replaceAll('Exception: ', '')));
    }

  }

  Future<void> _onSelectVehicle(SelectVehicle event, Emitter<BookingState> emit) async {
    final currentState = state;
    if (currentState is BookingVehicleOptionsLoaded) {
      if (currentState.appliedPromoCode != null) {
        final origFares = currentState.originalFares ?? currentState.calculatedFares;
        final origFare = origFares[event.vehicle.id] ?? event.vehicle.baseFare;
        try {
          final result = await _bookingRepository.validatePromo(
            currentState.appliedPromoCode!,
            origFare,
            vehicleTypeId: event.vehicle.id,
          );
          final double finalFare = (result['finalFareMinor'] as int) / 100.0;
          final double discount = (result['discountAmountMinor'] as int) / 100.0;
          final newFares = Map<String, double>.from(origFares);
          newFares[event.vehicle.id] = finalFare;

          emit(currentState.copyWith(
            selectedVehicle: event.vehicle,
            calculatedFares: newFares,
            discountAmount: discount,
          ));
          return;
        } catch (_) {
          // If promo doesn't apply to this vehicle (e.g. min fare threshold),
          // preserve original fare for this vehicle
          final newFares = Map<String, double>.from(origFares);
          emit(currentState.copyWith(
            selectedVehicle: event.vehicle,
            calculatedFares: newFares,
          ));
          return;
        }
      }
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
          promoCode: currentState.appliedPromoCode,
          passenger: event.passenger?.toJson(),
          notes: event.notes,
        );
        print('[BookingBloc] requestRide successful: $result');
        
        final rideId = result['ride']?['id']?.toString() ?? 'fake_ride_id_${DateTime.now().millisecondsSinceEpoch}';
        final trackingUrl = result['trackingUrl']?.toString();
        PassengerInfo? passengerInfo = event.passenger;
        if (result['passenger'] != null && result['passenger'] is Map) {
          passengerInfo = PassengerInfo.fromJson(Map<String, dynamic>.from(result['passenger'] as Map));
        }
        
        emit(BookingConfirmed(
          rideId: rideId,
          pickup: currentState.pickup,
          pickupName: currentState.pickupName,
          destination: currentState.destination,
          destinationName: currentState.destinationName,
          selectedVehicle: currentState.selectedVehicle,
          fare: selectedFare,
          paymentMethod: event.paymentMethod,
          passenger: passengerInfo,
          trackingUrl: trackingUrl,
          notes: event.notes,
        ));

      } catch (e) {
        print('[BookingBloc] ConfirmRideBooking failed: $e');
        emit(BookingError(e.toString().replaceAll('Exception: ', '')));
        // Restore loaded options so user can retry or change vehicle/payment
        emit(currentState);
      }
    }
  }


  void _onClearBooking(ClearBooking event, Emitter<BookingState> emit) {
    emit(BookingInitial());
  }
}
