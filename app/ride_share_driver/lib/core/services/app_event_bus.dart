import 'dart:async';

enum AppEventType {
  rideCompleted,
  tabSwitched,
  refreshAll,
}

class AppEvent {
  final AppEventType type;
  final dynamic payload;

  AppEvent(this.type, [this.payload]);
}

class AppEventBus {
  static final StreamController<AppEvent> _controller =
      StreamController<AppEvent>.broadcast();

  static Stream<AppEvent> get stream => _controller.stream;

  static void emit(AppEventType type, [dynamic payload]) {
    if (!_controller.isClosed) {
      _controller.add(AppEvent(type, payload));
    }
  }

  static void notifyRideCompleted([dynamic payload]) {
    emit(AppEventType.rideCompleted, payload);
  }

  static void notifyTabSwitched(int tabIndex) {
    emit(AppEventType.tabSwitched, tabIndex);
  }

  static void notifyRefreshAll() {
    emit(AppEventType.refreshAll);
  }
}
