import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
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
      final data = response.data['MESSAGE'];
      if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<Map<String, dynamic>> initiateSubscription(String planId) async {
    try {
      final idempotencyKey = const Uuid().v4();
      final response = await apiClient.dio.post(
        '/subscriptions/initiate',
        data: {'planId': planId},
        options: Options(
          headers: {'Idempotency-Key': idempotencyKey},
        ),
      );
      if (response.data['SUCCESS'] != true || response.data['MESSAGE'] == null) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to start subscription purchase');
      }
      return Map<String, dynamic>.from(response.data['MESSAGE'] as Map);
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
      if (response.data['SUCCESS'] != true || response.data['MESSAGE'] == null) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Payment verification failed');
      }
      return Map<String, dynamic>.from(response.data['MESSAGE'] as Map);
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
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to load active subscription');
      }
      final data = response.data['MESSAGE'];
      if (data == null) return null;
      if (data is Map) {
        return Map<String, dynamic>.from(data);
      }
      return null;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  Future<List<dynamic>> getSubscriptionHistory() async {
    try {
      final response = await apiClient.dio.get('/subscriptions/history');
      if (response.data['SUCCESS'] != true) {
        throw ServerException(response.data['MESSAGE']?.toString() ?? 'Failed to load subscription history');
      }
      final data = response.data['MESSAGE'];
      if (data is Map && data['rows'] != null) {
        return data['rows'] as List<dynamic>;
      } else if (data is List) {
        return data;
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
