import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../domain/entities/rider_subscription_entities.dart';

abstract class RiderSubscriptionDataSource {
  Future<List<RiderSubscriptionPlan>> getPlans({String? countryId});
  Future<ActiveRiderSubscription?> getMySubscription();
  Future<List<SubscriptionHistoryItem>> getSubscriptionHistory({int page = 1, int limit = 20});
  Future<Map<String, dynamic>> initiateSubscription(String planId);
  Future<ActiveRiderSubscription> verifySubscription({
    required String planId,
    required String orderRef,
    required String paymentRef,
    String? signature,
  });
}

class RiderSubscriptionDataSourceImpl implements RiderSubscriptionDataSource {
  final DioClient _dioClient;

  RiderSubscriptionDataSourceImpl(this._dioClient);

  @override
  Future<List<RiderSubscriptionPlan>> getPlans({String? countryId}) async {
    try {
      final queryParams = countryId != null ? {'countryId': countryId} : null;
      final response = await _dioClient.dio.get(
        '/api/v1/rider-plans/plans',
        queryParameters: queryParams,
      );

      if (response.data != null && response.data['SUCCESS'] == true) {
        final List<dynamic> list = response.data['MESSAGE'] ?? [];
        return list.map((e) => RiderSubscriptionPlan.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  @override
  Future<ActiveRiderSubscription?> getMySubscription() async {
    try {
      final response = await _dioClient.dio.get('/api/v1/rider-plans/mine');
      if (response.data != null && response.data['SUCCESS'] == true) {
        final data = response.data['MESSAGE'];
        if (data == null) return null;
        return ActiveRiderSubscription.fromJson(Map<String, dynamic>.from(data as Map));
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  @override
  Future<List<SubscriptionHistoryItem>> getSubscriptionHistory({int page = 1, int limit = 20}) async {
    try {
      final response = await _dioClient.dio.get(
        '/api/v1/rider-plans/history',
        queryParameters: {'page': page, 'limit': limit},
      );

      if (response.data != null && response.data['SUCCESS'] == true) {
        final List<dynamic> list = response.data['MESSAGE'] ?? [];
        return list.map((e) => SubscriptionHistoryItem.fromJson(Map<String, dynamic>.from(e as Map))).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  @override
  Future<Map<String, dynamic>> initiateSubscription(String planId) async {
    final idempotencyKey = 'rider_sub_${DateTime.now().millisecondsSinceEpoch}_${planId.substring(0, planId.length > 8 ? 8 : planId.length)}';
    final response = await _dioClient.dio.post(
      '/api/v1/rider-plans/initiate',
      data: {'planId': planId},
      options: Options(headers: {
        'Idempotency-Key': idempotencyKey,
      }),
    );

    if (response.data != null && response.data['SUCCESS'] == true) {
      return Map<String, dynamic>.from(response.data['MESSAGE'] ?? {});
    }
    final msg = response.data?['MESSAGE']?.toString() ?? 'Failed to initiate subscription purchase';
    throw Exception(msg);
  }

  @override
  Future<ActiveRiderSubscription> verifySubscription({
    required String planId,
    required String orderRef,
    required String paymentRef,
    String? signature,
  }) async {
    final response = await _dioClient.dio.post(
      '/api/v1/rider-plans/verify',
      data: {
        'planId': planId,
        'orderRef': orderRef,
        'paymentRef': paymentRef,
        if (signature != null) 'signature': signature,
      },
    );

    if (response.data != null && response.data['SUCCESS'] == true) {
      return ActiveRiderSubscription.fromJson(Map<String, dynamic>.from(response.data['MESSAGE'] ?? {}));
    }
    final msg = response.data?['MESSAGE']?.toString() ?? 'Failed to verify subscription';
    throw Exception(msg);
  }
}
