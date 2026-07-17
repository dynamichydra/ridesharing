import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../../services/location_service.dart';
import '../../domain/repositories/driver_status_repository.dart';

// ── Events ──────────────────────────────────────────────────────────────────
abstract class DriverStatusEvent {}

class GoOnlineRequested extends DriverStatusEvent {}

class GoOfflineRequested extends DriverStatusEvent {}

// ── States ──────────────────────────────────────────────────────────────────
abstract class DriverStatusState {}

class DriverStatusOffline extends DriverStatusState {}

/// `goingOnline` distinguishes the two in-flight directions so the UI can
/// keep showing the correct prior value while a request is pending, instead
/// of guessing.
class DriverStatusTransitioning extends DriverStatusState {
  final bool goingOnline;
  DriverStatusTransitioning({required this.goingOnline});
}

class DriverStatusOnline extends DriverStatusState {}

/// `wasOnline` tells the UI which value to revert the toggle to — the
/// request never actually changed backend state, so the switch must not be
/// left showing whatever the driver tapped toward.
class DriverStatusError extends DriverStatusState {
  final String message;
  final bool wasOnline;
  DriverStatusError({required this.message, required this.wasOnline});
}

class DriverStatusBloc extends Bloc<DriverStatusEvent, DriverStatusState> {
  final DriverStatusRepository driverStatusRepository;
  final LocationService locationService;

  DriverStatusBloc({
    required this.driverStatusRepository,
    required this.locationService,
  }) : super(DriverStatusOffline()) {
    on<GoOnlineRequested>(_onGoOnlineRequested);
    on<GoOfflineRequested>(_onGoOfflineRequested);
  }

  Future<void> _onGoOnlineRequested(GoOnlineRequested event, Emitter<DriverStatusState> emit) async {
    emit(DriverStatusTransitioning(goingOnline: true));
    try {
      final position = await locationService.getCurrentPosition();
      await driverStatusRepository.goOnline(lat: position.latitude, lng: position.longitude);
      emit(DriverStatusOnline());
    } catch (e) {
      emit(DriverStatusError(message: e.toString(), wasOnline: false));
    }
  }

  Future<void> _onGoOfflineRequested(GoOfflineRequested event, Emitter<DriverStatusState> emit) async {
    emit(DriverStatusTransitioning(goingOnline: false));
    try {
      await driverStatusRepository.goOffline();
      emit(DriverStatusOffline());
    } catch (e) {
      emit(DriverStatusError(message: e.toString(), wasOnline: true));
    }
  }
}
