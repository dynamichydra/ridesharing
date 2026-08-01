import 'package:dio/dio.dart';
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
}
