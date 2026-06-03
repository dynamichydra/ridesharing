import '../../domain/repositories/notifications_repository.dart';
import '../datasources/notifications_datasource.dart';
import '../../../../core/errors/failures.dart';

class NotificationsRepositoryImpl implements NotificationsRepository {
  final NotificationsDataSource _notificationsDataSource;

  NotificationsRepositoryImpl(this._notificationsDataSource);

  @override
  Future<List<Map<String, dynamic>>> getNotifications() async {
    try {
      return await _notificationsDataSource.getNotifications();
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<void> markAsRead(String notificationId) async {
    try {
      await _notificationsDataSource.markAsRead(notificationId);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<void> deleteNotification(String notificationId) async {
    try {
      await _notificationsDataSource.deleteNotification(notificationId);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }
}
