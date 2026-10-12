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
    return RazorpayCheckoutResult._(
      success: true,
      paymentId: paymentId,
      orderId: orderId,
      signature: signature,
    );
  }

  factory RazorpayCheckoutResult.failure(String message) {
    return RazorpayCheckoutResult._(success: false, errorMessage: message);
  }
}

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
      finish(RazorpayCheckoutResult.success(
        paymentId: r.paymentId!,
        orderId: r.orderId!,
        signature: r.signature!,
      ));
    });

    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) {
      finish(RazorpayCheckoutResult.failure(r.message ?? 'Payment failed.'));
    });

    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse r) {
      finish(RazorpayCheckoutResult.failure('Selected external wallet (${r.walletName}) is not supported.'));
    });

    razorpay.open({
      'key': keyId,
      'order_id': gatewayOrderId,
      'amount': amountMinor,
      'currency': currencyCode,
      'name': 'Ryva Ride',
      'description': description,
    });

    return completer.future;
  }

  Future<RazorpayCheckoutResult> setupCard({
    required String keyId,
    required String customerId,
    required String gatewayOrderId,
    required String currencyCode,
  }) {
    final completer = Completer<RazorpayCheckoutResult>();
    final razorpay = Razorpay();

    void finish(RazorpayCheckoutResult result) {
      if (!completer.isCompleted) completer.complete(result);
      razorpay.clear();
    }

    razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, (PaymentSuccessResponse r) {
      if (r.paymentId == null) {
        finish(RazorpayCheckoutResult.failure('Setup succeeded but the response was incomplete.'));
        return;
      }
      finish(RazorpayCheckoutResult.success(
        paymentId: r.paymentId!,
        orderId: r.orderId ?? gatewayOrderId,
        signature: r.signature ?? '',
      ));
    });

    razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, (PaymentFailureResponse r) {
      finish(RazorpayCheckoutResult.failure(r.message ?? 'Setup failed.'));
    });

    razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, (ExternalWalletResponse r) {
      finish(RazorpayCheckoutResult.failure('External wallets are not supported for setup.'));
    });

    razorpay.open({
      'key': keyId,
      'order_id': gatewayOrderId, // Required for zero-auth or 1 INR verification in Razorpay
      'customer_id': customerId,
      'amount': 100, // 1 INR (refunded automatically)
      'currency': currencyCode,
      'name': 'Ryva Ride',
      'description': 'Card Verification (Auto Refunded)',
    });

    return completer.future;
  }
}
