import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/notifications_repository.dart';

// ==========================================
// Notifications Events
// ==========================================
abstract class NotificationsEvent extends Equatable {
  const NotificationsEvent();

  @override
  List<Object?> get props => [];
}

class LoadNotifications extends NotificationsEvent {}

class MarkNotificationAsRead extends NotificationsEvent {
  final String id;
  const MarkNotificationAsRead(this.id);

  @override
  List<Object?> get props => [id];
}

class DeleteNotificationEvent extends NotificationsEvent {
  final String id;
  const DeleteNotificationEvent(this.id);

  @override
  List<Object?> get props => [id];
}

// ==========================================
// Notifications States
// ==========================================
abstract class NotificationsState extends Equatable {
  const NotificationsState();

  @override
  List<Object?> get props => [];
}

class NotificationsInitial extends NotificationsState {}

class NotificationsLoading extends NotificationsState {}

class NotificationsLoaded extends NotificationsState {
  final List<Map<String, dynamic>> notifications;
  const NotificationsLoaded(this.notifications);

  @override
  List<Object?> get props => [notifications];
}

class NotificationsError extends NotificationsState {
  final String message;
  const NotificationsError(this.message);

  @override
  List<Object?> get props => [message];
}

// ==========================================
// Notifications BLoC
// ==========================================
class NotificationsBloc extends Bloc<NotificationsEvent, NotificationsState> {
  final NotificationsRepository _notificationsRepository;

  NotificationsBloc(this._notificationsRepository) : super(NotificationsInitial()) {
    on<LoadNotifications>(_onLoadNotifications);
    on<MarkNotificationAsRead>(_onMarkNotificationAsRead);
    on<DeleteNotificationEvent>(_onDeleteNotification);
  }

  Future<void> _onLoadNotifications(LoadNotifications event, Emitter<NotificationsState> emit) async {
    emit(NotificationsLoading());
    try {
      final list = await _notificationsRepository.getNotifications();
      emit(NotificationsLoaded(list));
    } catch (e) {
      emit(NotificationsError(e.toString()));
    }
  }

  Future<void> _onMarkNotificationAsRead(MarkNotificationAsRead event, Emitter<NotificationsState> emit) async {
    try {
      await _notificationsRepository.markAsRead(event.id);
      final list = await _notificationsRepository.getNotifications();
      emit(NotificationsLoaded(list));
    } catch (e) {
      emit(NotificationsError(e.toString()));
    }
  }

  Future<void> _onDeleteNotification(DeleteNotificationEvent event, Emitter<NotificationsState> emit) async {
    try {
      await _notificationsRepository.deleteNotification(event.id);
      final list = await _notificationsRepository.getNotifications();
      emit(NotificationsLoaded(list));
    } catch (e) {
      emit(NotificationsError(e.toString()));
    }
  }
}
