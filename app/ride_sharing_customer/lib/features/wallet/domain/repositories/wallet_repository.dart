abstract class WalletRepository {
  Future<Map<String, dynamic>> getWalletDetails();
  Future<void> addFunds(double amount, String paymentMethodId);
  Future<Map<String, dynamic>> payRideWithWallet(String rideId);
}
