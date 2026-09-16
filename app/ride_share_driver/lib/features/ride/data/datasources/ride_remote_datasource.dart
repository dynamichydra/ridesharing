import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';

class RideRemoteDataSource {
  final ApiClient apiClient;

  RideRemoteDataSource({required this.apiClient});

  Future<Map<String, dynamic>> markArriving(String rideId) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/arriving');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to mark arriving');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> markArrived(String rideId) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/arrived');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to mark arrived');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> startRide(String rideId, String otp) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/start', data: {
        'otp': otp,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to start ride');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> completeRide(String rideId) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/complete');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to complete ride');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Response is `{ rematching: true }`, not a ride row — the backend puts
  /// the ride back into `searching` and re-triggers matching from scratch.
  Future<void> cancelRideByDriver(String rideId, {String? reason}) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/driver-cancel', data: {
        if (reason != null) 'reason': reason,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to cancel ride');
      }
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Declares passenger no-show after waiting at pickup location.
  /// Backend computes waiting fee compensation and marks ride cancelled by driver.
  Future<Map<String, dynamic>> cancelNoShow(String rideId, {String? reason}) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/no-show', data: {
        'reason': reason ?? 'rider_no_show',
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to declare passenger no-show');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Triggers emergency SOS alert during an active ride.
  Future<Map<String, dynamic>> triggerSosAlert(String rideId, {double? lat, double? lng}) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/sos', data: {
        if (lat != null) 'lat': lat,
        if (lng != null) 'lng': lng,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to trigger SOS alert');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Returns null when the driver has no active ride — the backend itself
  /// returns `MESSAGE: null` in that case, it isn't an error.
  Future<Map<String, dynamic>?> getActiveRide() async {
    try {
      final response = await apiClient.dio.get('/rides/driver/active');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to load active ride');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>?;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> getRideReceipt(String rideId) async {
    try {
      final response = await apiClient.dio.get('/rides/$rideId/receipt');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to fetch ride receipt');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> generateShareToken(String rideId) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/share-token');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to generate share token');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> recordCashCollection(String rideId) async {
    try {
      final response = await apiClient.dio.post('/ride-payments/$rideId/cash-collect');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to record cash collection');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> raiseDispute({
    required String rideId,
    required String reason,
    String? description,
  }) async {
    try {
      final response = await apiClient.dio.post('/ride-disputes', data: {
        'rideId': rideId,
        'reason': reason,
        if (description != null) 'description': description,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to raise dispute');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<dynamic>> getMyDisputes() async {
    try {
      final response = await apiClient.dio.get('/ride-disputes/mine');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to fetch disputes');
      }
      final data = response.data['MESSAGE'];
      if (data is Map<String, dynamic> && data['rows'] != null) {
        return data['rows'] as List<dynamic>;
      } else if (data is List) {
        return data;
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> setDestinationMode({
    required String address,
    required double lat,
    required double lng,
  }) async {
    try {
      final response = await apiClient.dio.post('/drivers/destination-mode', data: {
        'address': address,
        'lat': lat,
        'lng': lng,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to set destination mode');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>?> getDestinationMode() async {
    try {
      final response = await apiClient.dio.get('/drivers/destination-mode');
      if (response.data['SUCCESS'] != true) {
        return null;
      }
      return response.data['MESSAGE'] as Map<String, dynamic>?;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> clearDestinationMode() async {
    try {
      final response = await apiClient.dio.delete('/drivers/destination-mode');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to clear destination mode');
      }
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<void> updateLocationPing(double lat, double lng) async {
    try {
      await apiClient.dio.post('/drivers/location', data: {
        'lat': lat,
        'lng': lng,
      });
    } catch (_) {}
  }

  Future<Map<String, dynamic>> reportLostItem({
    required String rideId,
    required String itemName,
    String? description,
  }) async {
    try {
      final response = await apiClient.dio.post('/lost-items/rides/$rideId', data: {
        'itemName': itemName,
        if (description != null) 'description': description,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to report lost item');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<dynamic>> getMyLostItems() async {
    try {
      final response = await apiClient.dio.get('/lost-items/mine');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to fetch lost items');
      }
      final data = response.data['MESSAGE'];
      if (data is Map<String, dynamic> && data['rows'] != null) {
        return data['rows'] as List<dynamic>;
      } else if (data is List) {
        return data;
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<dynamic>> getHeatmap(double lat, double lng) async {
    try {
      final response = await apiClient.dio.get('/drivers/heatmap', queryParameters: {
        'lat': lat,
        'lng': lng,
      });
      if (response.data['SUCCESS'] == true) {
        final data = response.data['MESSAGE'];
        if (data is List) return data;
        if (data is Map<String, dynamic> && data['zones'] is List) return data['zones'] as List;
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> rateRider({
    required String rideId,
    required int rating,
    String? review,
  }) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/rate-rider', data: {
        'rating': rating,
        if (review != null && review.isNotEmpty) 'review': review,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to rate rider');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
