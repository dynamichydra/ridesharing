import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../../../../core/utils/location_helper.dart';
import '../../domain/repositories/ride_tracking_repository.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../injection_container.dart';

// ==========================================
// Ride Tracking Events
// ==========================================
abstract class RideTrackingEvent extends Equatable {
  const RideTrackingEvent();
  @override
  List<Object?> get props => [];
}

class StartRideTracking extends RideTrackingEvent {
  final String rideId;
  final LatLng pickup;
  final String pickupName;
  final LatLng destination;
  final String destinationName;
  final String vehicleName;
  final double fare;

  const StartRideTracking({
    required this.rideId,
    required this.pickup,
    required this.pickupName,
    required this.destination,
    required this.destinationName,
    required this.vehicleName,
    required this.fare,
  });

  @override
  List<Object?> get props => [rideId, pickup, pickupName, destination, destinationName, vehicleName, fare];
}

class DriverAssigned extends RideTrackingEvent {
  final Map<String, dynamic> driverData;
  const DriverAssigned(this.driverData);
  @override
  List<Object?> get props => [driverData];
}

class DriverLocationUpdated extends RideTrackingEvent {
  final LatLng location;
  const DriverLocationUpdated(this.location);
  @override
  List<Object?> get props => [location];
}

class RideStarted extends RideTrackingEvent {}

class RideCompleted extends RideTrackingEvent {
  final double? finalFare;
  const RideCompleted({this.finalFare});
  @override
  List<Object?> get props => [finalFare];
}

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

// Represents the state when we are waiting for a driver to be assigned by backend
class RideTrackingSearching extends RideTrackingState {}

class RideTrackingActive extends RideTrackingState {
  final String rideId;
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
  final double fare;
  final String vehicleName;

  const RideTrackingActive({
    required this.rideId,
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
    required this.fare,
    required this.vehicleName,
  });

  RideTrackingActive copyWith({
    LatLng? driverPosition,
    double? driverBearing,
    List<LatLng>? routePoints,
    String? trackingState,
    double? fare,
  }) {
    return RideTrackingActive(
      rideId: rideId,
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
      fare: fare ?? this.fare,
      vehicleName: vehicleName,
    );
  }

  @override
  List<Object?> get props => [
        rideId, driverName, driverRating, driverAvatar, driverVehicle, plateNumber,
        pickup, pickupName, destination, destinationName, driverPosition,
        driverBearing, routePoints, trackingState, fare, vehicleName,
      ];
}

class RideTrackingCancelled extends RideTrackingState {}

// ==========================================
// Ride Tracking BLoC
// ==========================================
class RideTrackingBloc extends Bloc<RideTrackingEvent, RideTrackingState> {
  final RideTrackingRepository _rideTrackingRepository;
  
  StreamSubscription? _driverAssignedSub;
  StreamSubscription? _driverLocationSub;
  StreamSubscription? _rideStartedSub;
  StreamSubscription? _rideCompletedSub;
  StreamSubscription? _rideCancelledSub;

  late StartRideTracking _initialRideData;

  RideTrackingBloc(this._rideTrackingRepository) : super(RideTrackingInitial()) {
    on<StartRideTracking>(_onStartRideTracking);
    on<DriverAssigned>(_onDriverAssigned);
    on<DriverLocationUpdated>(_onDriverLocationUpdated);
    on<RideStarted>(_onRideStarted);
    on<RideCompleted>(_onRideCompleted);
    on<CancelRide>(_onCancelRide);
  }

  Future<void> _onStartRideTracking(StartRideTracking event, Emitter<RideTrackingState> emit) async {
    _initialRideData = event;
    emit(RideTrackingSearching());
    
    await _rideTrackingRepository.connectToRide(event.rideId);

    // Subscribe to socket streams
    _driverAssignedSub = _rideTrackingRepository.onDriverAssigned.listen((data) {
      add(DriverAssigned(data));
    });
    
    _driverLocationSub = _rideTrackingRepository.onDriverLocation.listen((data) {
      final lat = double.tryParse(data['lat'].toString());
      final lng = double.tryParse(data['lng'].toString());
      if (lat != null && lng != null) {
        add(DriverLocationUpdated(LatLng(lat, lng)));
      }
    });

    _rideStartedSub = _rideTrackingRepository.onRideStarted.listen((data) {
      add(RideStarted());
    });

    _rideCompletedSub = _rideTrackingRepository.onRideCompleted.listen((data) {
      final finalFare = double.tryParse(data['finalFare']?.toString() ?? '');
      add(RideCompleted(finalFare: finalFare));
    });

    _rideCancelledSub = _rideTrackingRepository.onRideCancelled.listen((data) {
      add(CancelRide());
    });
  }

  Future<void> _onDriverAssigned(DriverAssigned event, Emitter<RideTrackingState> emit) async {
    // The backend emits { rideId, driver: { id, name, phone, vehicleNumber,
    // vehicleModel, rating, profilePhoto, currentLat, currentLng } }
    // from RIDE_ACCEPTED → Kafka → ride:driver_assigned socket event.
    final raw = event.driverData;

    // The socket payload wraps the driver under a 'driver' key
    final driver = (raw['driver'] is Map)
        ? Map<String, dynamic>.from(raw['driver'] as Map)
        : raw; // fallback: the whole payload IS the driver object

    // Real driver position from the backend
    final double? driverLat = double.tryParse(driver['currentLat']?.toString() ?? '');
    final double? driverLng = double.tryParse(driver['currentLng']?.toString() ?? '');

    // If backend didn't include live lat/lng yet, fall back to a small offset
    // from pickup so the map still renders — the first location_update event
    // will correct it within seconds.
    final driverPosition = (driverLat != null && driverLng != null)
        ? LatLng(driverLat, driverLng)
        : LatLng(
            _initialRideData.pickup.latitude + 0.008,
            _initialRideData.pickup.longitude + 0.008,
          );

    final points = _rideTrackingRepository.getRoutePoints(driverPosition, _initialRideData.pickup);

    emit(RideTrackingActive(
      rideId: _initialRideData.rideId,
      driverName: driver['name']?.toString() ?? 'Your Driver',
      driverRating: double.tryParse(driver['rating']?.toString() ?? '5.0') ?? 5.0,
      driverAvatar: driver['profilePhoto']?.toString() ?? '',
      driverVehicle: driver['vehicleModel']?.toString() ?? 'Car',
      plateNumber: driver['vehicleNumber']?.toString() ?? '—',
      pickup: _initialRideData.pickup,
      pickupName: _initialRideData.pickupName,
      destination: _initialRideData.destination,
      destinationName: _initialRideData.destinationName,
      driverPosition: driverPosition,
      driverBearing: LocationHelper.calculateBearing(
        driverPosition.latitude,
        driverPosition.longitude,
        _initialRideData.pickup.latitude,
        _initialRideData.pickup.longitude,
      ),
      routePoints: points,
      trackingState: 'driverArriving',
      fare: _initialRideData.fare,
      vehicleName: _initialRideData.vehicleName,
    ));
  }


  void _onDriverLocationUpdated(DriverLocationUpdated event, Emitter<RideTrackingState> emit) {
    final currentState = state;
    if (currentState is RideTrackingActive) {
      final bearing = LocationHelper.calculateBearing(
        currentState.driverPosition.latitude,
        currentState.driverPosition.longitude,
        event.location.latitude,
        event.location.longitude,
      );
      emit(currentState.copyWith(
        driverPosition: event.location,
        driverBearing: bearing,
      ));
    }
  }

  void _onRideStarted(RideStarted event, Emitter<RideTrackingState> emit) {
    final currentState = state;
    if (currentState is RideTrackingActive) {
      final pointsToDestination = _rideTrackingRepository.getRoutePoints(
        currentState.pickup,
        currentState.destination,
      );
      emit(currentState.copyWith(
        trackingState: 'rideInProgress',
        routePoints: pointsToDestination,
        driverBearing: LocationHelper.calculateBearing(
          currentState.pickup.latitude,
          currentState.pickup.longitude,
          currentState.destination.latitude,
          currentState.destination.longitude,
        ),
      ));
    }
  }

  Future<void> _onRideCompleted(RideCompleted event, Emitter<RideTrackingState> emit) async {
    final currentState = state;
    if (currentState is RideTrackingActive) {
      final finalFare = event.finalFare ?? currentState.fare;
      final completedState = currentState.copyWith(
        trackingState: 'rideCompleted',
        driverPosition: currentState.destination,
        fare: finalFare,
      );
      await _completeRideInCache(completedState);
      emit(completedState);
    }
  }

  Future<void> _completeRideInCache(RideTrackingActive activeRide) async {
    try {
      final storage = sl<StorageService>();
      final walletCached = storage.getCachedData('cached_wallet_data');
      if (walletCached != null) {
        final walletMap = Map<String, dynamic>.from(walletCached as Map);
        final double balance = (walletMap['balance'] as num).toDouble();
        final double nextBalance = balance - activeRide.fare;
        
        final transactions = (walletMap['transactions'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
        transactions.insert(0, {
          'id': 'tx_trip_${DateTime.now().millisecondsSinceEpoch}',
          'amount': activeRide.fare,
          'type': 'trip',
          'status': 'completed',
          'date': DateTime.now().toIso8601String(),
          'description': 'Ride to ${activeRide.destinationName}'
        });
        
        final updatedWallet = {
          ...walletMap,
          'balance': nextBalance,
          'transactions': transactions,
        };
        await storage.cacheData('cached_wallet_data', updatedWallet);
      }
      
      final historyCached = storage.getCachedData('cached_ride_history_data');
      final List<Map<String, dynamic>> historyList = [];
      if (historyCached != null) {
        historyList.addAll((historyCached as List).map((e) => Map<String, dynamic>.from(e as Map)));
      }
      
      final newHistoryItem = {
        'id': 'ride_${DateTime.now().millisecondsSinceEpoch}',
        'pickup_name': activeRide.pickupName,
        'destination_name': activeRide.destinationName,
        'fare': activeRide.fare,
        'status': 'completed',
        'date': DateTime.now().toIso8601String(),
        'driver': {
          'name': activeRide.driverName,
          'rating': activeRide.driverRating,
          'avatar': activeRide.driverAvatar,
          'vehicle': activeRide.driverVehicle,
        }
      };
      
      historyList.insert(0, newHistoryItem);
      await storage.cacheData('cached_ride_history_data', historyList);
    } catch (_) {
    }
  }

  void _onCancelRide(CancelRide event, Emitter<RideTrackingState> emit) {
    _cleanup();
    emit(RideTrackingCancelled());
  }

  void _cleanup() {
    _rideTrackingRepository.disconnectFromRide();
    _driverAssignedSub?.cancel();
    _driverLocationSub?.cancel();
    _rideStartedSub?.cancel();
    _rideCompletedSub?.cancel();
    _rideCancelledSub?.cancel();
  }

  @override
  Future<void> close() {
    _cleanup();
    return super.close();
  }
}
