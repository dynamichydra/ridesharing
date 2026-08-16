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

class RestoreActiveRide extends RideTrackingEvent {}

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
    on<RestoreActiveRide>(_onRestoreActiveRide);
  }

  void _subscribeSocketEvents() {
    _driverAssignedSub?.cancel();
    _driverLocationSub?.cancel();
    _rideStartedSub?.cancel();
    _rideCompletedSub?.cancel();
    _rideCancelledSub?.cancel();

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

  Future<void> _onStartRideTracking(StartRideTracking event, Emitter<RideTrackingState> emit) async {
    _initialRideData = event;
    emit(RideTrackingSearching());

    try {
      final storage = sl<StorageService>();
      await storage.cacheData('active_ride_tracking', {
        'rideId': event.rideId,
        'pickupLat': event.pickup.latitude,
        'pickupLng': event.pickup.longitude,
        'pickupName': event.pickupName,
        'dropLat': event.destination.latitude,
        'dropLng': event.destination.longitude,
        'destinationName': event.destinationName,
        'vehicleName': event.vehicleName,
        'fare': event.fare,
        'trackingState': 'searching',
      });
    } catch (_) {}
    
    await _rideTrackingRepository.connectToRide(event.rideId);
    _subscribeSocketEvents();
  }

  Future<void> _onRestoreActiveRide(RestoreActiveRide event, Emitter<RideTrackingState> emit) async {
    try {
      final storage = sl<StorageService>();
      final cached = storage.getCachedData('active_ride_tracking');
      if (cached == null) return;
      final map = Map<String, dynamic>.from(cached as Map);

      final String rideId = map['rideId']?.toString() ?? '';
      if (rideId.isEmpty) return;

      final pickup = LatLng(
        (map['pickupLat'] as num).toDouble(),
        (map['pickupLng'] as num).toDouble(),
      );
      final destination = LatLng(
        (map['dropLat'] as num).toDouble(),
        (map['dropLng'] as num).toDouble(),
      );
      final pickupName = map['pickupName']?.toString() ?? 'Pickup';
      final destinationName = map['destinationName']?.toString() ?? 'Destination';
      final vehicleName = map['vehicleName']?.toString() ?? 'Car';
      final fare = (map['fare'] as num).toDouble();
      final trackingState = map['trackingState']?.toString() ?? 'searching';

      _initialRideData = StartRideTracking(
        rideId: rideId,
        pickup: pickup,
        pickupName: pickupName,
        destination: destination,
        destinationName: destinationName,
        vehicleName: vehicleName,
        fare: fare,
      );

      await _rideTrackingRepository.connectToRide(rideId);
      _subscribeSocketEvents();

      if (trackingState == 'searching' || map['driver'] == null) {
        emit(RideTrackingSearching());
      } else {
        final driver = Map<String, dynamic>.from(map['driver'] as Map);
        final driverPosition = LatLng(
          (driver['lat'] as num).toDouble(),
          (driver['lng'] as num).toDouble(),
        );
        final points = _rideTrackingRepository.getRoutePoints(
          driverPosition,
          trackingState == 'driverArriving' ? pickup : destination,
        );

        emit(RideTrackingActive(
          rideId: rideId,
          driverName: driver['name']?.toString() ?? 'Your Driver',
          driverRating: (driver['rating'] as num?)?.toDouble() ?? 5.0,
          driverAvatar: driver['avatar']?.toString() ?? '',
          driverVehicle: driver['vehicle']?.toString() ?? 'Car',
          plateNumber: driver['plateNumber']?.toString() ?? '—',
          pickup: pickup,
          pickupName: pickupName,
          destination: destination,
          destinationName: destinationName,
          driverPosition: driverPosition,
          driverBearing: LocationHelper.calculateBearing(
            driverPosition.latitude,
            driverPosition.longitude,
            (trackingState == 'driverArriving' ? pickup : destination).latitude,
            (trackingState == 'driverArriving' ? pickup : destination).longitude,
          ),
          routePoints: points,
          trackingState: trackingState,
          fare: fare,
          vehicleName: vehicleName,
        ));
      }
    } catch (_) {}
  }

  Future<void> _onDriverAssigned(DriverAssigned event, Emitter<RideTrackingState> emit) async {
    final raw = event.driverData;

    final driver = (raw['driver'] is Map)
        ? Map<String, dynamic>.from(raw['driver'] as Map)
        : raw;

    final double? driverLat = double.tryParse(driver['currentLat']?.toString() ?? '');
    final double? driverLng = double.tryParse(driver['currentLng']?.toString() ?? '');

    final driverPosition = (driverLat != null && driverLng != null)
        ? LatLng(driverLat, driverLng)
        : LatLng(
            _initialRideData.pickup.latitude + 0.008,
            _initialRideData.pickup.longitude + 0.008,
          );

    final points = _rideTrackingRepository.getRoutePoints(driverPosition, _initialRideData.pickup);

    final activeState = RideTrackingActive(
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
    );

    try {
      final storage = sl<StorageService>();
      final cached = storage.getCachedData('active_ride_tracking');
      final Map<String, dynamic> map = cached != null ? Map<String, dynamic>.from(cached as Map) : {};
      map['trackingState'] = 'driverArriving';
      map['driver'] = {
        'name': activeState.driverName,
        'rating': activeState.driverRating,
        'avatar': activeState.driverAvatar,
        'vehicle': activeState.driverVehicle,
        'plateNumber': activeState.plateNumber,
        'lat': driverPosition.latitude,
        'lng': driverPosition.longitude,
      };
      await storage.cacheData('active_ride_tracking', map);
    } catch (_) {}

    emit(activeState);
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
      final updatedState = currentState.copyWith(
        driverPosition: event.location,
        driverBearing: bearing,
      );

      try {
        final storage = sl<StorageService>();
        final cached = storage.getCachedData('active_ride_tracking');
        if (cached != null) {
          final Map<String, dynamic> map = Map<String, dynamic>.from(cached as Map);
          if (map['driver'] is Map) {
            final driverMap = Map<String, dynamic>.from(map['driver'] as Map);
            driverMap['lat'] = event.location.latitude;
            driverMap['lng'] = event.location.longitude;
            map['driver'] = driverMap;
            storage.cacheData('active_ride_tracking', map);
          }
        }
      } catch (_) {}

      emit(updatedState);
    }
  }

  void _onRideStarted(RideStarted event, Emitter<RideTrackingState> emit) {
    final currentState = state;
    if (currentState is RideTrackingActive) {
      final pointsToDestination = _rideTrackingRepository.getRoutePoints(
        currentState.pickup,
        currentState.destination,
      );
      final updatedState = currentState.copyWith(
        trackingState: 'rideInProgress',
        routePoints: pointsToDestination,
        driverBearing: LocationHelper.calculateBearing(
          currentState.pickup.latitude,
          currentState.pickup.longitude,
          currentState.destination.latitude,
          currentState.destination.longitude,
        ),
      );

      try {
        final storage = sl<StorageService>();
        final cached = storage.getCachedData('active_ride_tracking');
        if (cached != null) {
          final Map<String, dynamic> map = Map<String, dynamic>.from(cached as Map);
          map['trackingState'] = 'rideInProgress';
          storage.cacheData('active_ride_tracking', map);
        }
      } catch (_) {}

      emit(updatedState);
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
      try {
        final storage = sl<StorageService>();
        await storage.cacheData('active_ride_tracking', null);
      } catch (_) {}
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
