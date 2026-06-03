import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/constants/constants.dart';

abstract class ProfileDataSource {
  Future<Map<String, dynamic>> getUserProfile();
  Future<void> updateUserProfile(String name, String email, String phone);
  Future<List<Map<String, dynamic>>> getRideHistory();
  Future<void> updateSavedPlaces(List<Map<String, dynamic>> places);
  Future<void> updatePaymentMethods(List<Map<String, dynamic>> methods);
}

class ProfileDataSourceImpl implements ProfileDataSource {
  final DioClient _dioClient;
  final StorageService _storageService;
  
  static const String _profileCacheKey = 'cached_profile_data';
  static const String _rideHistoryCacheKey = 'cached_ride_history_data';

  ProfileDataSourceImpl(this._dioClient, this._storageService);

  @override
  Future<Map<String, dynamic>> getUserProfile() async {
    final cached = _storageService.getCachedData(_profileCacheKey);
    if (cached != null) {
      return Map<String, dynamic>.from(cached as Map);
    }
    
    final response = await _dioClient.getMockData(AppMockAssets.users);
    final userMap = Map<String, dynamic>.from(response as Map);
    await _storageService.cacheData(_profileCacheKey, userMap);
    return userMap;
  }

  @override
  Future<void> updateUserProfile(String name, String email, String phone) async {
    await Future.delayed(const Duration(milliseconds: 500));
    final current = await getUserProfile();
    final updated = {
      ...current,
      'name': name,
      'email': email,
      'phone': phone,
    };
    await _storageService.cacheData(_profileCacheKey, updated);
  }

  @override
  Future<List<Map<String, dynamic>>> getRideHistory() async {
    final cached = _storageService.getCachedData(_rideHistoryCacheKey);
    if (cached != null) {
      return (cached as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    }
    
    final response = await _dioClient.getMockData(AppMockAssets.rideHistory) as List<dynamic>;
    final list = response.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    await _storageService.cacheData(_rideHistoryCacheKey, list);
    return list;
  }

  @override
  Future<void> updateSavedPlaces(List<Map<String, dynamic>> places) async {
    await Future.delayed(const Duration(milliseconds: 400));
    final current = await getUserProfile();
    final updated = {
      ...current,
      'saved_places': places,
    };
    await _storageService.cacheData(_profileCacheKey, updated);
  }

  @override
  Future<void> updatePaymentMethods(List<Map<String, dynamic>> methods) async {
    await Future.delayed(const Duration(milliseconds: 400));
    final current = await getUserProfile();
    final updated = {
      ...current,
      'payment_methods': methods,
    };
    await _storageService.cacheData(_profileCacheKey, updated);
  }
}
