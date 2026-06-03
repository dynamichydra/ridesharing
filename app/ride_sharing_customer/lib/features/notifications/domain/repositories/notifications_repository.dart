abstract class NotificationsRepository {
  Future<List<Map<String, dynamic>>> getNotifications();
  Future<void> markAsRead(String notificationId);
  Future<void> deleteNotification(String notificationId);
}
