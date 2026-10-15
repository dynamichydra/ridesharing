abstract class WalletRepository {
  Future<Map<String, dynamic>> getWalletDetails();
  Future<void> addFunds(double amount, String paymentMethodId);
  Future<Map<String, dynamic>> initiateTopup(double amount, {String? paymentMethodId, String? promoCode});
  Future<List<Map<String, dynamic>>> getTopupCoupons();
  Future<Map<String, dynamic>> previewTopupCoupon(double amount, String code);
  Future<void> verifyTopup({
    required String orderRef,
    required String paymentRef,
    String? signature,
  });
  Future<Map<String, dynamic>> payRideWithWallet(String rideId);
}
