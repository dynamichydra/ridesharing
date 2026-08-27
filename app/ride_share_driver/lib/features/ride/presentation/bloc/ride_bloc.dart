import 'dart:async';
import 'dart:math' as math;
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';
import '../../../../services/app_logger.dart';
import '../../../../services/location_service.dart';
import '../../domain/entities/active_ride.dart';
import '../../domain/entities/ride_offer.dart';
import '../../domain/entities/ride_accept_result.dart';
import '../../domain/repositories/ride_repository.dart';

// ── Events ──────────────────────────────────────────────────────────────────
abstract class RideEvent {}

class ConnectRideSocket extends RideEvent {}

class DisconnectRideSocket extends RideEvent {}

class AcceptOfferRequested extends RideEvent {
  final String rideId;
  AcceptOfferRequested({required this.rideId});
}

class DeclineOfferRequested extends RideEvent {
  final String rideId;
  final String? reason;
  DeclineOfferRequested({required this.rideId, this.reason});
}

/// Fired by the UI's own local countdown — the backend doesn't push an
/// explicit "offer expired" event, so the client times it out itself (same
/// approach documented for the rider/driver offer UX generally).
class OfferExpiredLocally extends RideEvent {
  final String rideId;
  OfferExpiredLocally({required this.rideId});
}

class MarkArrivingRequested extends RideEvent {}

class StartRideRequested extends RideEvent {
  final String otp;
  StartRideRequested({required this.otp});
}

class CompleteRideRequested extends RideEvent {}

class DriverCancelRequested extends RideEvent {
  final String? reason;
  DriverCancelRequested({this.reason});
}

class AcknowledgeCompletionRequested extends RideEvent {}

// Internal — bridge the repository's broadcast streams into the event queue.
class _OfferArrived extends RideEvent {
  final RideOffer offer;
  _OfferArrived(this.offer);
}

class _OfferTakenByOther extends RideEvent {
  final String rideId;
  _OfferTakenByOther(this.rideId);
}

class _CancelledByRider extends RideEvent {
  final String rideId;
  _CancelledByRider(this.rideId);
}

class _AcceptResultArrived extends RideEvent {
  final RideAcceptResult result;
  _AcceptResultArrived(this.result);
}

class _SocketErrorArrived extends RideEvent {
  final String message;
  _SocketErrorArrived(this.message);
}

class _DriverLocationChanged extends RideEvent {
  final Position position;
  _DriverLocationChanged(this.position);
}

// ── States ──────────────────────────────────────────────────────────────────
abstract class RideState {}

/// Connected (or connecting) and waiting for offers.
class RideIdle extends RideState {}

class RideOfferPending extends RideState {
  final List<RideOffer> offers;
  final RideOffer offer;
  RideOfferPending({required this.offers})
    : offer = offers.isNotEmpty
          ? offers.first
          : throw ArgumentError('offers cannot be empty');
}

/// The offer went away for a reason other than the driver's own action
/// (taken by another driver, or the local countdown ran out).
class RideOfferGone extends RideState {
  final String message;
  RideOfferGone({required this.message});
}

class RideAccepting extends RideState {
  final RideOffer? offer;
  RideAccepting({this.offer});
}

/// `ride.status` (accepted | arriving | started) drives which sub-screen /
/// primary action the UI shows — carries driver position, bearing, and
/// the registered car path (breadcrumbs array).
class RideActive extends RideState {
  final ActiveRide ride;
  final LatLng? driverPosition;
  final double driverBearing;
  final List<LatLng> traveledPath;

  RideActive({
    required this.ride,
    this.driverPosition,
    this.driverBearing = 0.0,
    this.traveledPath = const [],
  });

  RideActive copyWith({
    ActiveRide? ride,
    LatLng? driverPosition,
    double? driverBearing,
    List<LatLng>? traveledPath,
  }) {
    return RideActive(
      ride: ride ?? this.ride,
      driverPosition: driverPosition ?? this.driverPosition,
      driverBearing: driverBearing ?? this.driverBearing,
      traveledPath: traveledPath ?? this.traveledPath,
    );
  }
}

/// A REST lifecycle call (arriving/start/complete/cancel) is in flight —
/// carries the ride so the UI doesn't have to blank out while waiting.
class RideActionInProgress extends RideState {
  final ActiveRide ride;
  RideActionInProgress({required this.ride});
}

class RideCompleted extends RideState {
  final ActiveRide ride;
  RideCompleted({required this.ride});
}

/// The rider cancelled after this driver had already accepted.
class RideCancelledByRider extends RideState {
  final String message;
  RideCancelledByRider({required this.message});
}

class RideOperationFailed extends RideState {
  final String message;
  RideOperationFailed({required this.message});
}

// ── BLoC ───────────────────────────────────────────────────────────────────
class RideBloc extends Bloc<RideEvent, RideState> {
  final RideRepository rideRepository;
  final LocationService locationService;

  StreamSubscription<RideOffer>? _offerSub;
  StreamSubscription<String>? _takenSub;
  StreamSubscription<String>? _cancelledSub;
  StreamSubscription<RideAcceptResult>? _acceptResultSub;
  StreamSubscription<String>? _socketErrorSub;
  StreamSubscription<Position>? _locationSub;

  ActiveRide? _currentRide;
  final List<RideOffer> _pendingOffers = [];
  LatLng? _lastDriverPos;
  double _lastDriverBearing = 0.0;
  final List<LatLng> _traveledPath = [];

  RideBloc({required this.rideRepository, required this.locationService})
    : super(RideIdle()) {
    on<ConnectRideSocket>(_onConnect);
    on<DisconnectRideSocket>(_onDisconnect);
    on<AcceptOfferRequested>(_onAcceptOfferRequested);
    on<DeclineOfferRequested>(_onDeclineOfferRequested);
    on<OfferExpiredLocally>(_onOfferExpiredLocally);
    on<MarkArrivingRequested>(_onMarkArrivingRequested);
    on<StartRideRequested>(_onStartRideRequested);
    on<CompleteRideRequested>(_onCompleteRideRequested);
    on<DriverCancelRequested>(_onDriverCancelRequested);
    on<_DriverLocationChanged>(_onDriverLocationChanged);
    on<AcknowledgeCompletionRequested>((event, emit) {
      _currentRide = null;
      _traveledPath.clear();
      _pendingOffers.clear();
      emit(RideIdle());
    });

    on<_OfferArrived>((event, emit) {
      if (state is RideActive ||
          state is RideActionInProgress ||
          state is RideAccepting ||
          _currentRide != null) {
        // Driver already has an active trip in progress — do not accept/show other offers
        return;
      }
      _pendingOffers.removeWhere((o) => o.rideId == event.offer.rideId);
      _pendingOffers.insert(0, event.offer);
      emit(RideOfferPending(offers: List.unmodifiable(_pendingOffers)));
    });
    on<_OfferTakenByOther>((event, emit) {
      if (_currentRide?.id == event.rideId ||
          _acceptedOffer?.rideId == event.rideId ||
          (state is RideAccepting && _acceptedOffer?.rideId == event.rideId) ||
          state is RideActive) {
        return;
      }
      final wasInPending = _pendingOffers.any((o) => o.rideId == event.rideId);
      _pendingOffers.removeWhere((o) => o.rideId == event.rideId);
      if (wasInPending) {
        if (_pendingOffers.isEmpty) {
          emit(RideIdle());
        } else {
          emit(RideOfferPending(offers: List.unmodifiable(_pendingOffers)));
        }
      }
    });
    on<_CancelledByRider>((event, emit) {
      final wasInPending = _pendingOffers.any((o) => o.rideId == event.rideId);
      _pendingOffers.removeWhere((o) => o.rideId == event.rideId);

      if (_currentRide?.id == event.rideId) {
        _currentRide = null;
        _traveledPath.clear();
        emit(RideCancelledByRider(message: 'The rider cancelled this trip.'));
        emit(RideIdle());
      } else if (wasInPending) {
        if (_pendingOffers.isEmpty) {
          emit(RideIdle());
        } else {
          emit(RideOfferPending(offers: List.unmodifiable(_pendingOffers)));
        }
      }
    });
    on<_AcceptResultArrived>(_onAcceptResultArrived);
    on<_SocketErrorArrived>(
      (event, emit) => emit(RideOperationFailed(message: event.message)),
    );
  }

  Future<void> _onConnect(
    ConnectRideSocket event,
    Emitter<RideState> emit,
  ) async {
    rideRepository.connect();

    _offerSub ??= rideRepository.onRideOffer.listen(
      (offer) => add(_OfferArrived(offer)),
    );
    _takenSub ??= rideRepository.onRideTaken.listen(
      (rideId) => add(_OfferTakenByOther(rideId)),
    );
    _cancelledSub ??= rideRepository.onRideCancelledByRider.listen(
      (rideId) => add(_CancelledByRider(rideId)),
    );
    _acceptResultSub ??= rideRepository.onAcceptResult.listen(
      (result) => add(_AcceptResultArrived(result)),
    );
    _socketErrorSub ??= rideRepository.onSocketError.listen(
      (message) => add(_SocketErrorArrived(message)),
    );

    _locationSub ??= locationService.getPositionStream().listen(
      (pos) => add(_DriverLocationChanged(pos)),
      onError: (e) => AppLogger.w('[RideBloc] location stream error: $e'),
    );

    // Send immediate initial location ping to update Redis & H3 index without waiting for GPS movement
    locationService.getCurrentPosition().then((pos) {
      add(_DriverLocationChanged(pos));
    }).catchError((e) {
      AppLogger.w('[RideBloc] failed to get initial position on connect: $e');
    });

    // Restore an in-progress ride if the app was killed/restarted mid-trip.
    try {
      final active = await rideRepository.getActiveRide();
      if (active != null) {
        _currentRide = active;
        emit(
          RideActive(
            ride: active,
            driverPosition: _lastDriverPos,
            driverBearing: _lastDriverBearing,
            traveledPath: List.unmodifiable(_traveledPath),
          ),
        );
        return;
      }
    } catch (e) {
      AppLogger.w('[RideBloc] getActiveRide check failed: $e');
    }
    emit(RideIdle());
  }

  void _onDriverLocationChanged(
    _DriverLocationChanged event,
    Emitter<RideState> emit,
  ) {
    final pos = event.position;
    final newPos = LatLng(pos.latitude, pos.longitude);

    if (_lastDriverPos != null) {
      _lastDriverBearing = _calculateBearing(
        _lastDriverPos!.latitude,
        _lastDriverPos!.longitude,
        newPos.latitude,
        newPos.longitude,
      );
    }
    _lastDriverPos = newPos;

    if (_currentRide != null) {
      _traveledPath.add(newPos);
    } else {
      _traveledPath.clear();
    }

    rideRepository.sendLocationUpdate(
      pos.latitude,
      pos.longitude,
      accuracy: pos.accuracy,
      speedKmh: pos.speed * 3.6,
      recordedAt: pos.timestamp.millisecondsSinceEpoch,
    );

    final currentState = state;
    if (currentState is RideActive) {
      emit(
        currentState.copyWith(
          driverPosition: newPos,
          driverBearing: _lastDriverBearing,
          traveledPath: List.unmodifiable(_traveledPath),
        ),
      );
    }
  }

  double _calculateBearing(
    double startLat,
    double startLng,
    double endLat,
    double endLng,
  ) {
    final startLatRad = startLat * math.pi / 180;
    final startLngRad = startLng * math.pi / 180;
    final endLatRad = endLat * math.pi / 180;
    final endLngRad = endLng * math.pi / 180;
    final dLng = endLngRad - startLngRad;
    final y = math.sin(dLng) * math.cos(endLatRad);
    final x =
        math.cos(startLatRad) * math.sin(endLatRad) -
        math.sin(startLatRad) * math.cos(endLatRad) * math.cos(dLng);
    return (math.atan2(y, x) * 180 / math.pi + 360) % 360;
  }

  void _onDisconnect(DisconnectRideSocket event, Emitter<RideState> emit) {
    _cleanupSocket();
  }

  void _cleanupSocket() {
    rideRepository.disconnect();
    _offerSub?.cancel();
    _takenSub?.cancel();
    _cancelledSub?.cancel();
    _acceptResultSub?.cancel();
    _socketErrorSub?.cancel();
    _locationSub?.cancel();
    _offerSub = null;
    _takenSub = null;
    _cancelledSub = null;
    _acceptResultSub = null;
    _socketErrorSub = null;
    _locationSub = null;
  }

  RideOffer? _acceptedOffer;

  void _onAcceptOfferRequested(
    AcceptOfferRequested event,
    Emitter<RideState> emit,
  ) {
    if (state is RideActive || state is RideActionInProgress || _currentRide != null) {
      emit(RideOperationFailed(message: 'You already have an active ride in progress'));
      return;
    }
    for (final o in _pendingOffers) {
      if (o.rideId == event.rideId) {
        _acceptedOffer = o;
        break;
      }
    }
    emit(RideAccepting(offer: _acceptedOffer));
    rideRepository.acceptOffer(event.rideId);
  }

  void _onDeclineOfferRequested(
    DeclineOfferRequested event,
    Emitter<RideState> emit,
  ) {
    _pendingOffers.removeWhere((o) => o.rideId == event.rideId);
    rideRepository.declineOffer(event.rideId, reason: event.reason);
    if (_pendingOffers.isEmpty) {
      emit(RideIdle());
    } else {
      emit(RideOfferPending(offers: List.unmodifiable(_pendingOffers)));
    }
  }

  void _onOfferExpiredLocally(
    OfferExpiredLocally event,
    Emitter<RideState> emit,
  ) {
    _pendingOffers.removeWhere((o) => o.rideId == event.rideId);
    if (_pendingOffers.isEmpty) {
      emit(RideIdle());
    } else {
      emit(RideOfferPending(offers: List.unmodifiable(_pendingOffers)));
    }
  }

  Future<void> _onAcceptResultArrived(
    _AcceptResultArrived event,
    Emitter<RideState> emit,
  ) async {
    switch (event.result) {
      case RideAcceptSucceeded(:final rideId):
        try {
          ActiveRide? ride;
          try {
            ride = await rideRepository.getActiveRide();
          } catch (e) {
            AppLogger.w(
              '[RideBloc] getActiveRide after accept failed, using fallback: $e',
            );
          }

          if (ride == null && _acceptedOffer != null) {
            ride = ActiveRide.fromOffer(_acceptedOffer!);
          } else if (ride == null && _pendingOffers.isNotEmpty) {
            try {
              final matched = _pendingOffers.firstWhere(
                (o) => o.rideId == rideId,
              );
              ride = ActiveRide.fromOffer(matched);
            } catch (_) {
              ride = ActiveRide.fromOffer(_pendingOffers.first);
            }
          }

          if (ride == null) {
            emit(
              RideOperationFailed(
                message: 'Ride was accepted but details could not be loaded.',
              ),
            );
            emit(RideIdle());
            return;
          }

          _currentRide = ride;
          _pendingOffers.clear();
          _acceptedOffer = null;
          emit(
            RideActive(
              ride: ride,
              driverPosition: _lastDriverPos,
              driverBearing: _lastDriverBearing,
              traveledPath: List.unmodifiable(_traveledPath),
            ),
          );
        } catch (e) {
          emit(RideOperationFailed(message: e.toString()));
          emit(RideIdle());
        }
      case RideAcceptFailed(:final message):
        _acceptedOffer = null;
        emit(RideOperationFailed(message: message));
        emit(RideIdle());
    }
  }

  Future<void> _onMarkArrivingRequested(
    MarkArrivingRequested event,
    Emitter<RideState> emit,
  ) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      final updated = await rideRepository.markArriving(ride.id);
      _currentRide = updated;
      emit(RideActive(
        ride: updated,
        driverPosition: _lastDriverPos,
        driverBearing: _lastDriverBearing,
        traveledPath: List.unmodifiable(_traveledPath),
      ));
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(
        ride: ride,
        driverPosition: _lastDriverPos,
        driverBearing: _lastDriverBearing,
        traveledPath: List.unmodifiable(_traveledPath),
      ));
    }
  }

  Future<void> _onStartRideRequested(
    StartRideRequested event,
    Emitter<RideState> emit,
  ) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      final updated = await rideRepository.startRide(ride.id, event.otp);
      _currentRide = updated;
      emit(RideActive(
        ride: updated,
        driverPosition: _lastDriverPos,
        driverBearing: _lastDriverBearing,
        traveledPath: List.unmodifiable(_traveledPath),
      ));
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(
        ride: ride,
        driverPosition: _lastDriverPos,
        driverBearing: _lastDriverBearing,
        traveledPath: List.unmodifiable(_traveledPath),
      ));
    }
  }

  Future<void> _onCompleteRideRequested(
    CompleteRideRequested event,
    Emitter<RideState> emit,
  ) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      final updated = await rideRepository.completeRide(ride.id);
      _currentRide = null;
      _traveledPath.clear();
      emit(RideCompleted(ride: updated));
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(
        ride: ride,
        driverPosition: _lastDriverPos,
        driverBearing: _lastDriverBearing,
        traveledPath: List.unmodifiable(_traveledPath),
      ));
    }
  }

  Future<void> _onDriverCancelRequested(
    DriverCancelRequested event,
    Emitter<RideState> emit,
  ) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      await rideRepository.cancelRideByDriver(ride.id, reason: event.reason);
      _currentRide = null;
      _traveledPath.clear();
      emit(RideIdle());
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(
        ride: ride,
        driverPosition: _lastDriverPos,
        driverBearing: _lastDriverBearing,
        traveledPath: List.unmodifiable(_traveledPath),
      ));
    }
  }

  @override
  Future<void> close() {
    _cleanupSocket();
    return super.close();
  }
}
