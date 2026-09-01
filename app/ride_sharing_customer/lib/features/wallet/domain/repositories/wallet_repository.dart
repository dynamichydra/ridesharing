abstract class WalletRepository {
  Future<Map<String, dynamic>> getWalletDetails();
  Future<void> addFunds(double amount, String paymentMethodId);
  Future<Map<String, dynamic>> initiateTopup(double amount);
  Future<void> verifyTopup({
    required String orderRef,
    required String paymentRef,
    String? signature,
  });
  Future<Map<String, dynamic>> payRideWithWallet(String rideId);
}
