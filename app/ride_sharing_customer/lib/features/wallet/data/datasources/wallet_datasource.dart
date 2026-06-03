import '../../../../core/network/dio_client.dart';
import '../../../../core/services/storage_service.dart';
import '../../../../core/constants/constants.dart';

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
    final cached = _storageService.getCachedData(_walletCacheKey);
    if (cached != null) {
      return Map<String, dynamic>.from(cached as Map);
    }
    
    final response = await _dioClient.getMockData(AppMockAssets.wallet);
    final walletMap = Map<String, dynamic>.from(response as Map);
    await _storageService.cacheData(_walletCacheKey, walletMap);
    return walletMap;
  }

  @override
  Future<void> addFunds(double amount, String paymentMethodId) async {
    await Future.delayed(const Duration(milliseconds: 500));
    final current = await getWalletDetails();
    
    final double balance = (current['balance'] as num).toDouble();
    final double nextBalance = balance + amount;
    
    final transactions = (current['transactions'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    transactions.insert(0, {
      'id': 'tx_topup_${DateTime.now().millisecondsSinceEpoch}',
      'amount': amount,
      'type': 'topup',
      'status': 'completed',
      'date': DateTime.now().toIso8601String(),
      'description': 'Added funds via Card'
    });

    final updated = {
      'balance': nextBalance,
      'currency': current['currency'],
      'transactions': transactions,
    };

    await _storageService.cacheData(_walletCacheKey, updated);
  }
}
