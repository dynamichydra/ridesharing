import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';

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
    try {
      final response = await _dioClient.dio.get('/api/v1/riders/profile');
      if (response.data['SUCCESS'] == true) {
        final profile = Map<String, dynamic>.from(response.data['MESSAGE'] as Map);
        await _storageService.cacheData(_profileCacheKey, profile);
        return profile;
      }
    } catch (_) {
      // Fallback to cache if request fails
      final cached = _storageService.getCachedData(_profileCacheKey);
      if (cached != null) {
        return Map<String, dynamic>.from(cached as Map);
      }
    }

    // Default basic structure if everything is missing
    return {
      'id': 'unknown',
      'name': 'Rider User',
      'email': '',
      'phone': '',
      'rating': 5.0,
      'saved_places': [],
      'payment_methods': []
    };
  }

  @override
  Future<void> updateUserProfile(String name, String email, String phone) async {
    try {
      await _dioClient.dio.patch('/api/v1/riders/profile', data: {
        'name': name,
        'email': email,
        'phone': phone,
      });
      final current = await getUserProfile();
      final updated = {
        ...current,
        'name': name,
        'email': email,
        'phone': phone,
      };
      await _storageService.cacheData(_profileCacheKey, updated);
    } catch (e) {
      throw Exception('Failed to update profile: $e');
    }
  }

  @override
  Future<List<Map<String, dynamic>>> getRideHistory() async {
    try {
      final response = await _dioClient.dio.get('/api/v1/riders/rides');
      if (response.data['SUCCESS'] == true) {
        final List<dynamic> list = response.data['MESSAGE'] ?? [];
        final mappedList = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        await _storageService.cacheData(_rideHistoryCacheKey, mappedList);
        return mappedList;
      }
    } catch (_) {
      final cached = _storageService.getCachedData(_rideHistoryCacheKey);
      if (cached != null) {
        return (cached as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
    }
    return [];
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

