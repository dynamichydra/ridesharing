import 'package:dio/dio.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';

abstract class WalletDataSource {
  Future<Map<String, dynamic>> getWalletDetails();
  Future<void> addFunds(double amount, String paymentMethodId);
}

class WalletDataSourceImpl implements WalletDataSource {
  final DioClient _dioClient;
  final StorageService _storageService;
  static const String _walletCacheKey = 'cached_wallet_data';

  WalletDataSourceImpl(this._dioClient, this._storageService);

  @override
  Future<Map<String, dynamic>> getWalletDetails() async {
    try {
      final response = await _dioClient.dio.get('/api/v1/wallets/me');
      dynamic rawData = response.data;
      if (rawData is Map) {
        rawData = rawData['MESSAGE'] ?? rawData['data'] ?? rawData;
      }
      final data = Map<String, dynamic>.from(rawData as Map);
      final int balanceMinor = (data['balanceMinor'] as num?)?.toInt() ?? 0;
      final double balance = balanceMinor / 100.0;
      final String currency = data['currencyCode']?.toString() ?? 'INR';

      List<Map<String, dynamic>> txsList = [];
      try {
        final txRes = await _dioClient.dio.get('/api/v1/wallets/me/transactions');
        dynamic rawTxData = txRes.data;
        if (rawTxData is Map) {
          rawTxData = rawTxData['MESSAGE'] ?? rawTxData['data'] ?? rawTxData['rows'] ?? [];
        }
        if (rawTxData is List) {
          txsList = (rawTxData as List).map((t) {
            final m = Map<String, dynamic>.from(t as Map);
            final int amtMinor = (m['amountMinor'] as num?)?.toInt() ?? 0;
            final String type = m['type']?.toString().toLowerCase() ?? 'credit';
            final bool isAdd = type == 'credit';
            final String reason = m['reason']?.toString() ?? '';
            final String desc = m['description']?.toString() ??
                (reason == 'topup'
                    ? 'Added Money'
                    : (reason.contains('ride') ? 'Ride Payment' : 'Wallet Transaction'));

            return {
              'id': m['id']?.toString() ?? '',
              'amount': amtMinor / 100.0,
              'type': type,
              'isAdd': isAdd,
              'reason': reason,
              'status': 'completed',
              'date': m['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
              'description': desc,
            };
          }).toList();
        }
      } catch (e) {
        // In case transactions endpoint is empty or unreachable
      }

      final result = {
        'id': data['id'],
        'balance': balance,
        'currency': currency,
        'transactions': txsList,
      };

      await _storageService.cacheData(_walletCacheKey, result);
      return result;
    } catch (e) {
      final cached = _storageService.getCachedData(_walletCacheKey);
      if (cached != null) {
        return Map<String, dynamic>.from(cached as Map);
      }
      
      return {
        'id': '',
        'balance': 0.0,
        'currency': 'INR',
        'transactions': <Map<String, dynamic>>[],
      };
    }
  }

  @override
  Future<void> addFunds(double amount, String paymentMethodId) async {
    final amountMinor = (amount * 100).round();
    final idempotencyKey = 'topup_${DateTime.now().millisecondsSinceEpoch}';
    
    await _dioClient.dio.post(
      '/api/v1/wallets/me/topup/initiate',
      data: {'amountMinor': amountMinor},
      options: Options(
        headers: {'Idempotency-Key': idempotencyKey},
      ),
    );
    
    // Clear cached wallet so next fetch gets the fresh balance from server
    await _storageService.clearCache();
  }
}
