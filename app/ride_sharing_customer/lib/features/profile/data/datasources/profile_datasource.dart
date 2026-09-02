import 'package:dio/dio.dart';
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
    Map<String, dynamic> profile = {
      'id': 'unknown',
      'name': 'Rider User',
      'email': '',
      'phone': '',
      'rating': 5.0,
      'saved_places': [],
      'payment_methods': []
    };

    try {
      final response = await _dioClient.dio.get('/api/v1/riders/profile');
      if (response.data['SUCCESS'] == true) {
        profile = Map<String, dynamic>.from(response.data['MESSAGE'] as Map);
      }
    } catch (_) {
      final cached = _storageService.getCachedData(_profileCacheKey);
      if (cached != null) {
        profile = Map<String, dynamic>.from(cached as Map);
      }
    }

    // Fetch live saved places from backend /api/v1/saved-places
    try {
      final spResponse = await _dioClient.dio.get('/api/v1/saved-places');
      if (spResponse.data['SUCCESS'] == true && spResponse.data['MESSAGE'] is List) {
        final List<dynamic> spList = spResponse.data['MESSAGE'];
        final mappedSavedPlaces = spList.map((e) {
          final item = Map<String, dynamic>.from(e as Map);
          return {
            'id': item['id']?.toString() ?? '',
            'type': item['label']?.toString() ?? 'favorite',
            'name': item['name']?.toString() ?? (item['label']?.toString() ?? 'Place'),
            'address': item['address']?.toString() ?? '',
            'latitude': double.tryParse(item['lat']?.toString() ?? '') ?? 0.0,
            'longitude': double.tryParse(item['lng']?.toString() ?? '') ?? 0.0,
            'isDefaultPickup': item['isDefaultPickup'] == true,
          };
        }).toList();
        profile['saved_places'] = mappedSavedPlaces;
      }
    } catch (_) {
      // Keep cached or profile saved_places if saved-places endpoint is unreachable
      if (profile['saved_places'] == null) {
        final cached = _storageService.getCachedData(_profileCacheKey);
        if (cached is Map && cached['saved_places'] != null) {
          profile['saved_places'] = cached['saved_places'];
        }
      }
    }

    await _storageService.cacheData(_profileCacheKey, profile);
    return profile;
  }

  @override
  Future<void> updateUserProfile(String name, String email, String phone) async {
    try {
      final response = await _dioClient.dio.patch('/api/v1/riders/profile', data: {
        'name': name,
        'email': email,
        'phone': phone,
      });
      if (response.data is Map && response.data['SUCCESS'] == false) {
        throw Exception(response.data['MESSAGE'] ?? 'Failed to update profile.');
      }
      final current = await getUserProfile();
      final updated = {
        ...current,
        'name': name,
        'email': email,
        'phone': phone,
      };
      await _storageService.cacheData(_profileCacheKey, updated);
    } catch (e) {
      if (e is DioException) {
        if (e.response != null && e.response?.data is Map) {
          final msg = e.response?.data['MESSAGE'] ?? e.response?.data['message'];
          if (msg != null && msg.toString().isNotEmpty) {
            throw Exception(msg.toString());
          }
        }
      }
      if (e is Exception) {
        rethrow;
      }
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
    final current = await getUserProfile();
    final updated = {
      ...current,
      'saved_places': places,
    };
    await _storageService.cacheData(_profileCacheKey, updated);

    // Sync each place to backend /api/v1/saved-places
    try {
      // First, get remote list to know if we need to delete any deleted places
      final spResponse = await _dioClient.dio.get('/api/v1/saved-places');
      if (spResponse.data['SUCCESS'] == true && spResponse.data['MESSAGE'] is List) {
        final List<dynamic> remoteList = spResponse.data['MESSAGE'];
        final currentIds = places.map((p) => p['id']?.toString()).toSet();
        for (final remoteItem in remoteList) {
          final remoteId = remoteItem['id']?.toString();
          if (remoteId != null && remoteId.isNotEmpty && !currentIds.contains(remoteId)) {
            try {
              await _dioClient.dio.delete('/api/v1/saved-places/$remoteId');
            } catch (_) {}
          }
        }
      }

      // Upsert current places
      for (final place in places) {
        final type = (place['type'] ?? 'favorite').toString().toLowerCase();
        final label = ['home', 'work', 'favorite', 'custom'].contains(type) ? type : 'custom';
        final payload = {
          'label': label,
          'name': place['name']?.toString() ?? '',
          'address': place['address']?.toString() ?? '',
          'lat': place['latitude']?.toString() ?? '0.0',
          'lng': place['longitude']?.toString() ?? '0.0',
          'isDefaultPickup': place['isDefaultPickup'] == true,
        };
        await _dioClient.dio.post('/api/v1/saved-places', data: payload);
      }
    } catch (_) {
      // If network fails, local cached update above ensures seamless offline/optimistic UX
    }
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

