import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/constants/constants.dart';

abstract class NotificationsDataSource {
  Future<List<Map<String, dynamic>>> getNotifications();
  Future<void> markAsRead(String notificationId);
  Future<void> deleteNotification(String notificationId);
}

class NotificationsDataSourceImpl implements NotificationsDataSource {
  final DioClient _dioClient;
  final StorageService _storageService;
  
  static const String _notificationsCacheKey = 'cached_notifications_data';

  NotificationsDataSourceImpl(this._dioClient, this._storageService);

  @override
  Future<List<Map<String, dynamic>>> getNotifications() async {
    try {
      final response = await _dioClient.dio.get('/api/v1/rider/notifications');
      if (response.data is Map && response.data['DATA'] is List) {
        final list = (response.data['DATA'] as List)
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList();
        await _storageService.cacheData(_notificationsCacheKey, list);
        return list;
      }
    } catch (_) {
      // Fallback to cache or mock if offline or error
    }

    final cached = _storageService.getCachedData(_notificationsCacheKey);
    if (cached != null) {
      return (cached as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    
    final response = await _dioClient.getMockData(AppMockAssets.notifications) as List<dynamic>;
    final list = response.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    await _storageService.cacheData(_notificationsCacheKey, list);
    return list;
  }

  @override
  Future<void> markAsRead(String notificationId) async {
    try {
      await _dioClient.dio.patch('/api/v1/rider/notifications/$notificationId/read');
    } catch (_) {}

    final current = await getNotifications();
    final updated = current.map((e) {
      if (e['id'] == notificationId) {
        return {
          ...e,
          'is_read': true,
        };
      }
      return e;
    }).toList();
    await _storageService.cacheData(_notificationsCacheKey, updated);
  }

  @override
  Future<void> deleteNotification(String notificationId) async {
    final current = await getNotifications();
    final updated = current.where((e) => e['id'] != notificationId).toList();
    await _storageService.cacheData(_notificationsCacheKey, updated);
  }
}
