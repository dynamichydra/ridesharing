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

  Future<Map<String, dynamic>> startRide(String rideId) async {
    try {
      final response = await apiClient.dio.post('/rides/$rideId/start');
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
}
