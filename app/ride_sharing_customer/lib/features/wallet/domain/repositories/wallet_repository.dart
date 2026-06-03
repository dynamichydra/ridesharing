abstract class WalletRepository {
  Future<Map<String, dynamic>> getWalletDetails();
  Future<void> addFunds(double amount, String paymentMethodId);
}
