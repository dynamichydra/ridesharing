import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
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

class StartRideRequested extends RideEvent {}

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

// ── States ──────────────────────────────────────────────────────────────────
abstract class RideState {}

/// Connected (or connecting) and waiting for offers.
class RideIdle extends RideState {}

class RideOfferPending extends RideState {
  final RideOffer offer;
  RideOfferPending({required this.offer});
}

/// The offer went away for a reason other than the driver's own action
/// (taken by another driver, or the local countdown ran out).
class RideOfferGone extends RideState {
  final String message;
  RideOfferGone({required this.message});
}

class RideAccepting extends RideState {}

/// `ride.status` (accepted | arriving | started) drives which sub-screen /
/// primary action the UI shows — mirrors how the backend itself models it,
/// rather than inventing parallel Accepted/Arriving/Started state classes.
class RideActive extends RideState {
  final ActiveRide ride;
  RideActive({required this.ride});
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

  static const _locationPingInterval = Duration(seconds: 5);

  StreamSubscription<RideOffer>? _offerSub;
  StreamSubscription<String>? _takenSub;
  StreamSubscription<String>? _cancelledSub;
  StreamSubscription<RideAcceptResult>? _acceptResultSub;
  StreamSubscription<String>? _socketErrorSub;
  Timer? _locationTimer;

  ActiveRide? _currentRide;
  String? _pendingOfferRideId;

  RideBloc({required this.rideRepository, required this.locationService}) : super(RideIdle()) {
    on<ConnectRideSocket>(_onConnect);
    on<DisconnectRideSocket>(_onDisconnect);
    on<AcceptOfferRequested>(_onAcceptOfferRequested);
    on<DeclineOfferRequested>(_onDeclineOfferRequested);
    on<OfferExpiredLocally>(_onOfferExpiredLocally);
    on<MarkArrivingRequested>(_onMarkArrivingRequested);
    on<StartRideRequested>(_onStartRideRequested);
    on<CompleteRideRequested>(_onCompleteRideRequested);
    on<DriverCancelRequested>(_onDriverCancelRequested);
    on<AcknowledgeCompletionRequested>((event, emit) {
      _currentRide = null;
      emit(RideIdle());
    });

    on<_OfferArrived>((event, emit) {
      _pendingOfferRideId = event.offer.rideId;
      emit(RideOfferPending(offer: event.offer));
    });
    on<_OfferTakenByOther>((event, emit) {
      if (_pendingOfferRideId != event.rideId) return;
      _pendingOfferRideId = null;
      emit(RideOfferGone(message: 'Another driver accepted this ride.'));
    });
    on<_CancelledByRider>((event, emit) {
      if (_currentRide?.id != event.rideId) return;
      _currentRide = null;
      emit(RideCancelledByRider(message: 'The rider cancelled this trip.'));
    });
    on<_AcceptResultArrived>(_onAcceptResultArrived);
    on<_SocketErrorArrived>((event, emit) => emit(RideOperationFailed(message: event.message)));
  }

  Future<void> _onConnect(ConnectRideSocket event, Emitter<RideState> emit) async {
    rideRepository.connect();

    _offerSub ??= rideRepository.onRideOffer.listen((offer) => add(_OfferArrived(offer)));
    _takenSub ??= rideRepository.onRideTaken.listen((rideId) => add(_OfferTakenByOther(rideId)));
    _cancelledSub ??= rideRepository.onRideCancelledByRider.listen((rideId) => add(_CancelledByRider(rideId)));
    _acceptResultSub ??= rideRepository.onAcceptResult.listen((result) => add(_AcceptResultArrived(result)));
    _socketErrorSub ??= rideRepository.onSocketError.listen((message) => add(_SocketErrorArrived(message)));

    // Keeps the backend's live Redis position fresh, and (if this driver is
    // currently on a ride) drives the rider-facing approach/trip tracking —
    // see `handleDriverLocationUpdate` in `ride.service.js`. Runs for the
    // whole time the driver is online, not just during an active trip, same
    // as a real driver app.
    _locationTimer ??= Timer.periodic(_locationPingInterval, (_) async {
      try {
        final position = await locationService.getCurrentPosition();
        rideRepository.sendLocationUpdate(position.latitude, position.longitude);
      } catch (e) {
        AppLogger.w('[RideBloc] location ping failed: $e');
      }
    });

    // Restore an in-progress ride if the app was killed/restarted mid-trip.
    try {
      final active = await rideRepository.getActiveRide();
      if (active != null) {
        _currentRide = active;
        emit(RideActive(ride: active));
        return;
      }
    } catch (e) {
      AppLogger.w('[RideBloc] getActiveRide check failed: $e');
    }
    emit(RideIdle());
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
    _locationTimer?.cancel();
    _offerSub = null;
    _takenSub = null;
    _cancelledSub = null;
    _acceptResultSub = null;
    _socketErrorSub = null;
    _locationTimer = null;
  }

  void _onAcceptOfferRequested(AcceptOfferRequested event, Emitter<RideState> emit) {
    emit(RideAccepting());
    rideRepository.acceptOffer(event.rideId);
  }

  void _onDeclineOfferRequested(DeclineOfferRequested event, Emitter<RideState> emit) {
    _pendingOfferRideId = null;
    rideRepository.declineOffer(event.rideId, reason: event.reason);
    emit(RideIdle());
  }

  void _onOfferExpiredLocally(OfferExpiredLocally event, Emitter<RideState> emit) {
    if (_pendingOfferRideId != event.rideId) return;
    _pendingOfferRideId = null;
    emit(RideIdle());
  }

  Future<void> _onAcceptResultArrived(_AcceptResultArrived event, Emitter<RideState> emit) async {
    switch (event.result) {
      case RideAcceptSucceeded(:final rideId):
        try {
          final ride = await rideRepository.getActiveRide();
          if (ride == null || ride.id != rideId) {
            emit(RideOperationFailed(message: 'Ride was accepted but details could not be loaded.'));
            emit(RideIdle());
            return;
          }
          _currentRide = ride;
          emit(RideActive(ride: ride));
        } catch (e) {
          emit(RideOperationFailed(message: e.toString()));
          emit(RideIdle());
        }
      case RideAcceptFailed(:final message):
        emit(RideOperationFailed(message: message));
        emit(RideIdle());
    }
  }

  Future<void> _onMarkArrivingRequested(MarkArrivingRequested event, Emitter<RideState> emit) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      final updated = await rideRepository.markArriving(ride.id);
      _currentRide = updated;
      emit(RideActive(ride: updated));
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(ride: ride));
    }
  }

  Future<void> _onStartRideRequested(StartRideRequested event, Emitter<RideState> emit) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      final updated = await rideRepository.startRide(ride.id);
      _currentRide = updated;
      emit(RideActive(ride: updated));
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(ride: ride));
    }
  }

  Future<void> _onCompleteRideRequested(CompleteRideRequested event, Emitter<RideState> emit) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      final updated = await rideRepository.completeRide(ride.id);
      _currentRide = updated;
      emit(RideCompleted(ride: updated));
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(ride: ride));
    }
  }

  Future<void> _onDriverCancelRequested(DriverCancelRequested event, Emitter<RideState> emit) async {
    final ride = _currentRide;
    if (ride == null) return;
    emit(RideActionInProgress(ride: ride));
    try {
      await rideRepository.cancelRideByDriver(ride.id, reason: event.reason);
      _currentRide = null;
      emit(RideIdle());
    } catch (e) {
      emit(RideOperationFailed(message: e.toString()));
      emit(RideActive(ride: ride));
    }
  }

  @override
  Future<void> close() {
    _cleanupSocket();
    return super.close();
  }
}
