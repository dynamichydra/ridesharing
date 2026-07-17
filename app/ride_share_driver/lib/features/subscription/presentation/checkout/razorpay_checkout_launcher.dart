import 'dart:async';
import 'package:razorpay_flutter/razorpay_flutter.dart';

class RazorpayCheckoutResult {
  final bool success;
  final String? paymentId;
  final String? orderId;
  final String? signature;
  final String? errorMessage;

  const RazorpayCheckoutResult._({
    required this.success,
    this.paymentId,
    this.orderId,
    this.signature,
    this.errorMessage,
  });

  factory RazorpayCheckoutResult.success({
    required String paymentId,
    required String orderId,
    required String signature,
  }) {
    return RazorpayCheckoutResult._(success: true, paymentId: paymentId, orderId: orderId, signature: signature);
  }

  factory RazorpayCheckoutResult.failure(String message) {
    return RazorpayCheckoutResult._(success: false, errorMessage: message);
  }
}

/// Wraps `razorpay_flutter`'s callback-based checkout in a `Future`, so the
/// caller can `await` it the same way it awaits the Stripe checkout.
class RazorpayCheckoutLauncher {
  Future<RazorpayCheckoutResult> checkout({
    required String keyId,
    required String gatewayOrderId,
    required int amountMinor,
    required String currencyCode,
    required String description,
  }) {
    final completer = Completer<RazorpayCheckoutResult>();
    final razorpay = Razorpay();

    void finish(RazorpayCheckoutResult result) {
      if (!completer.isCompleted) completer.complete(result);
      razorpay.clear();
    }

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse r) {
      if (r.paymentId == null || r.orderId == null || r.signature == null) {
        finish(RazorpayCheckoutResult.failure('Payment succeeded but the response was incomplete.'));
        return;
      }
      finish(RazorpayCheckoutResult.success(paymentId: r.paymentId!, orderId: r.orderId!, signature: r.signature!));
    });

    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) {
      finish(RazorpayCheckoutResult.failure(r.message ?? 'Payment failed.'));
    });

    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse r) {
      finish(RazorpayCheckoutResult.failure('Selected external wallet (${r.walletName}) is not supported here.'));
    });

    razorpay.open({
      'key': keyId,
      'order_id': gatewayOrderId,
      'amount': amountMinor,
      'currency': currencyCode,
      'name': 'Ride Share Driver',
      'description': description,
    });

    return completer.future;
  }
}
