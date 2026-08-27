import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/error/app_exception.dart';

class WalletRemoteDataSource {
  final ApiClient apiClient;

  WalletRemoteDataSource({required this.apiClient});

  /// GET /api/v1/driver/bank-details
  Future<Map<String, dynamic>?> getBankDetails() async {
    try {
      final response = await apiClient.dio.get('/driver/bank-details');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load bank details');
      }
      final msg = data['MESSAGE'];
      return (msg is Map<String, dynamic>) ? msg : null;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// PUT /api/v1/driver/bank-details  { upiId? | accountNumber + routingCode }
  Future<Map<String, dynamic>> submitBankDetails(Map<String, dynamic> payload) async {
    try {
      final response = await apiClient.dio.put('/driver/bank-details', data: payload);
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to submit bank details');
      }
      return data['MESSAGE'] as Map<String, dynamic>;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// GET /api/v1/payout-accounts/mine
  Future<Map<String, dynamic>?> getPayoutAccount() async {
    try {
      final response = await apiClient.dio.get('/payout-accounts/mine');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Failed to load payout account');
      }
      final msg = data['MESSAGE'];
      return (msg is Map<String, dynamic>) ? msg : null;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// GET /api/v1/wallets/me
  Future<Map<String, dynamic>?> getWallet() async {
    try {
      final response = await apiClient.dio.get('/wallets/me');
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) return null;
      final msg = data['MESSAGE'];
      return (msg is Map<String, dynamic>) ? msg : null;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// GET /api/v1/wallets/me/transactions
  Future<List<Map<String, dynamic>>> getTransactions({int page = 1, int limit = 50}) async {
    try {
      final response = await apiClient.dio.get(
        '/wallets/me/transactions',
        queryParameters: {'page': page, 'limit': limit},
      );
      final data = response.data;
      if (data is Map<String, dynamic>) {
        final rows = data['MESSAGE'] ?? data['data'] ?? data['rows'] ?? [];
        if (rows is List) {
          return rows.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
      } else if (data is List) {
        return data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      }
      return [];
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// POST /api/v1/wallets/me/topup/demo or /initiate
  Future<Map<String, dynamic>> topup(int amountMinor, {bool isDemo = true}) async {
    try {
      if (isDemo) {
        final response = await apiClient.dio.post(
          '/wallets/me/topup/demo',
          data: {'amountMinor': amountMinor},
        );
        final data = response.data as Map<String, dynamic>;
        if (data['SUCCESS'] != true) {
          throw ServerException(data['MESSAGE']?.toString() ?? 'Top-up failed');
        }
        return (data['MESSAGE'] is Map<String, dynamic>) ? data['MESSAGE'] as Map<String, dynamic> : data;
      } else {
        final idempotencyKey = 'drv_topup_${DateTime.now().millisecondsSinceEpoch}';
        final response = await apiClient.dio.post(
          '/wallets/me/topup/initiate',
          data: {'amountMinor': amountMinor},
          options: Options(headers: {'Idempotency-Key': idempotencyKey}),
        );
        final data = response.data as Map<String, dynamic>;
        if (data['SUCCESS'] != true) {
          throw ServerException(data['MESSAGE']?.toString() ?? 'Top-up failed');
        }
        return (data['MESSAGE'] is Map<String, dynamic>) ? data['MESSAGE'] as Map<String, dynamic> : data;
      }
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }

  /// POST /api/v1/payouts/me/instant
  Future<Map<String, dynamic>> requestInstantPayout({int? amountMinor}) async {
    try {
      final idempotencyKey = const Uuid().v4();
      final response = await apiClient.dio.post(
        '/payouts/me/instant',
        data: {
          if (amountMinor != null) 'amountMinor': amountMinor,
        },
        options: Options(
          headers: {
            'Idempotency-Key': idempotencyKey,
          },
        ),
      );
      final data = response.data as Map<String, dynamic>;
      if (data['SUCCESS'] != true) {
        throw ServerException(data['MESSAGE']?.toString() ?? 'Payout failed');
      }
      return (data['MESSAGE'] is Map<String, dynamic>) ? data['MESSAGE'] as Map<String, dynamic> : data;
    } on DioException catch (e) {
      throw mapDioException(e);
    }
  }
}
