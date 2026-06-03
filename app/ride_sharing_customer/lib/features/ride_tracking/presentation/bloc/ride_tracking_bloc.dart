import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/utils/location_helper.dart';
import '../../domain/repositories/ride_tracking_repository.dart';

// ==========================================
// Ride Tracking Events
// ==========================================
abstract class RideTrackingEvent extends Equatable {
  const RideTrackingEvent();

  @override
  List<Object?> get props => [];
}

class StartRideTracking extends RideTrackingEvent {
  final LatLng pickup;
  final String pickupName;
  final LatLng destination;
  final String destinationName;
  final String vehicleName;
  final double fare;

  const StartRideTracking({
    required this.pickup,
    required this.pickupName,
    required this.destination,
    required this.destinationName,
    required this.vehicleName,
    required this.fare,
  });

  @override
  List<Object?> get props => [pickup, pickupName, destination, destinationName, vehicleName, fare];
}

class AdvanceSimulationStep extends RideTrackingEvent {}

class CancelRide extends RideTrackingEvent {}

// ==========================================
// Ride Tracking States
// ==========================================
abstract class RideTrackingState extends Equatable {
  const RideTrackingState();

  @override
  List<Object?> get props => [];
}

class RideTrackingInitial extends RideTrackingState {}

class RideTrackingLoading extends RideTrackingState {}

class RideTrackingActive extends RideTrackingState {
  final String driverName;
  final double driverRating;
  final String driverAvatar;
  final String driverVehicle;
  final String plateNumber;
  final LatLng pickup;
  final String pickupName;
  final LatLng destination;
  final String destinationName;
  final LatLng driverPosition;
  final double driverBearing;
  final List<LatLng> routePoints;
  final String trackingState; // 'driverArriving' or 'rideInProgress' or 'rideCompleted'
  final int stepIndex;
  final double fare;
  final String vehicleName;

  const RideTrackingActive({
    required this.driverName,
    required this.driverRating,
    required this.driverAvatar,
    required this.driverVehicle,
    required this.plateNumber,
    required this.pickup,
    required this.pickupName,
    required this.destination,
    required this.destinationName,
    required this.driverPosition,
    required this.driverBearing,
    required this.routePoints,
    required this.trackingState,
    required this.stepIndex,
    required this.fare,
    required this.vehicleName,
  });

  RideTrackingActive copyWith({
    LatLng? driverPosition,
    double? driverBearing,
    List<LatLng>? routePoints,
    String? trackingState,
    int? stepIndex,
  }) {
    return RideTrackingActive(
      driverName: driverName,
      driverRating: driverRating,
      driverAvatar: driverAvatar,
      driverVehicle: driverVehicle,
      plateNumber: plateNumber,
      pickup: pickup,
      pickupName: pickupName,
      destination: destination,
      destinationName: destinationName,
      driverPosition: driverPosition ?? this.driverPosition,
      driverBearing: driverBearing ?? this.driverBearing,
      routePoints: routePoints ?? this.routePoints,
      trackingState: trackingState ?? this.trackingState,
      stepIndex: stepIndex ?? this.stepIndex,
      fare: fare,
      vehicleName: vehicleName,
    );
  }

  @override
  List<Object?> get props => [
        driverName,
        driverRating,
        driverAvatar,
        driverVehicle,
        plateNumber,
        pickup,
        pickupName,
        destination,
        destinationName,
        driverPosition,
        driverBearing,
        routePoints,
        trackingState,
        stepIndex,
        fare,
        vehicleName,
      ];
}

class RideTrackingCancelled extends RideTrackingState {}

// ==========================================
// Ride Tracking BLoC
// ==========================================
class RideTrackingBloc extends Bloc<RideTrackingEvent, RideTrackingState> {
  final RideTrackingRepository _rideTrackingRepository;
  Timer? _simulationTimer;

  RideTrackingBloc(this._rideTrackingRepository) : super(RideTrackingInitial()) {
    on<StartRideTracking>(_onStartRideTracking);
    on<AdvanceSimulationStep>(_onAdvanceSimulationStep);
    on<CancelRide>(_onCancelRide);
  }

  Future<void> _onStartRideTracking(StartRideTracking event, Emitter<RideTrackingState> emit) async {
    emit(RideTrackingLoading());
    try {
      final driver = await _rideTrackingRepository.getDriverDetails();
      
      // Simulate driver starting coordinates offset by 0.015 lat/lng
      final driverStart = LatLng(event.pickup.latitude + 0.010, event.pickup.longitude + 0.010);
      
      // Get route coordinates from driver start to pickup location
      final points = _rideTrackingRepository.getRoutePoints(driverStart, event.pickup);

      emit(RideTrackingActive(
        driverName: driver['name'] as String,
        driverRating: (driver['rating'] as num).toDouble(),
        driverAvatar: driver['avatar'] as String,
        driverVehicle: driver['vehicle'] as String,
        plateNumber: driver['plate_number'] as String,
        pickup: event.pickup,
        pickupName: event.pickupName,
        destination: event.destination,
        destinationName: event.destinationName,
        driverPosition: driverStart,
        driverBearing: LocationHelper.calculateBearing(driverStart.latitude, driverStart.longitude, event.pickup.latitude, event.pickup.longitude),
        routePoints: points,
        trackingState: 'driverArriving',
        stepIndex: 0,
        fare: event.fare,
        vehicleName: event.vehicleName,
      ));

      // Start tick timer
      _startTimer();
    } catch (e) {
      emit(RideTrackingCancelled());
    }
  }

  void _onAdvanceSimulationStep(AdvanceSimulationStep event, Emitter<RideTrackingState> emit) {
    final currentState = state;
    if (currentState is RideTrackingActive) {
      final int nextIndex = currentState.stepIndex + 1;

      if (currentState.trackingState == 'driverArriving') {
        if (nextIndex < currentState.routePoints.length) {
          final nextPos = currentState.routePoints[nextIndex];
          final prevPos = currentState.driverPosition;
          final bearing = LocationHelper.calculateBearing(
            prevPos.latitude,
            prevPos.longitude,
            nextPos.latitude,
            nextPos.longitude,
          );

          emit(currentState.copyWith(
            driverPosition: nextPos,
            driverBearing: bearing,
            stepIndex: nextIndex,
          ));
        } else {
          // Reached pickup location! Transition state
          final pointsToDestination = _rideTrackingRepository.getRoutePoints(
            currentState.pickup,
            currentState.destination,
          );

          emit(currentState.copyWith(
            trackingState: 'rideInProgress',
            driverPosition: currentState.pickup,
            routePoints: pointsToDestination,
            stepIndex: 0,
            driverBearing: LocationHelper.calculateBearing(
              currentState.pickup.latitude,
              currentState.pickup.longitude,
              currentState.destination.latitude,
              currentState.destination.longitude,
            ),
          ));
        }
      } else if (currentState.trackingState == 'rideInProgress') {
        if (nextIndex < currentState.routePoints.length) {
          final nextPos = currentState.routePoints[nextIndex];
          final prevPos = currentState.driverPosition;
          final bearing = LocationHelper.calculateBearing(
            prevPos.latitude,
            prevPos.longitude,
            nextPos.latitude,
            nextPos.longitude,
          );

          emit(currentState.copyWith(
            driverPosition: nextPos,
            driverBearing: bearing,
            stepIndex: nextIndex,
          ));
        } else {
          // Reached destination! Completed state
          _stopTimer();
          emit(currentState.copyWith(
            trackingState: 'rideCompleted',
            driverPosition: currentState.destination,
          ));
        }
      }
    }
  }

  void _onCancelRide(CancelRide event, Emitter<RideTrackingState> emit) {
    _stopTimer();
    emit(RideTrackingCancelled());
  }

  void _startTimer() {
    _simulationTimer?.cancel();
    _simulationTimer = Timer.periodic(const Duration(milliseconds: 600), (timer) {
      add(AdvanceSimulationStep());
    });
  }

  void _stopTimer() {
    _simulationTimer?.cancel();
    _simulationTimer = null;
  }

  @override
  Future<void> close() {
    _stopTimer();
    return super.close();
  }
}
