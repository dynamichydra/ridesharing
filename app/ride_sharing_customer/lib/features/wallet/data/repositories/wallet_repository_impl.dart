import '../../domain/repositories/wallet_repository.dart';
import '../datasources/wallet_datasource.dart';
import '../../../../core/errors/failures.dart';

class WalletRepositoryImpl implements WalletRepository {
  final WalletDataSource _walletDataSource;

  WalletRepositoryImpl(this._walletDataSource);

  @override
  Future<Map<String, dynamic>> getWalletDetails() async {
    try {
      return await _walletDataSource.getWalletDetails();
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }

  @override
  Future<void> addFunds(double amount, String paymentMethodId) async {
    try {
      await _walletDataSource.addFunds(amount, paymentMethodId);
    } catch (e) {
      throw ServerFailure(e.toString());
    }
  }
}
