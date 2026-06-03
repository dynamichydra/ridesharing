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
