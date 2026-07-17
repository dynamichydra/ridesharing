import 'package:dio/dio.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';

class SubscriptionRemoteDataSource {
  final ApiClient apiClient;

  SubscriptionRemoteDataSource({required this.apiClient});

  Future<List<Map<String, dynamic>>> getPlans(String countryId) async {
    try {
      final response = await apiClient.dio.get('/subscriptions/plans', queryParameters: {'countryId': countryId});
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to load plans');
      }
      return (response.data['MESSAGE'] as List).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> initiateSubscription(String planId) async {
    try {
      final response = await apiClient.dio.post('/subscriptions/initiate', data: {'planId': planId});
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to start subscription purchase');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> verifySubscription({
    required String planId,
    required String orderRef,
    required String paymentRef,
    String? signature,
  }) async {
    try {
      final response = await apiClient.dio.post('/subscriptions/verify', data: {
        'planId': planId,
        'orderRef': orderRef,
        'paymentRef': paymentRef,
        if (signature != null) 'signature': signature,
      });
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Payment verification failed');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// Returns null when the driver has no active subscription — the backend
  /// itself returns `MESSAGE: null` in that case (see `getMySubscription` in
  /// `subscription.service.js`), it isn't an error.
  Future<Map<String, dynamic>?> getMySubscription() async {
    try {
      final response = await apiClient.dio.get('/subscriptions/mine');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to load subscription');
      }
      return response.data['MESSAGE'] as Map<String, dynamic>?;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
