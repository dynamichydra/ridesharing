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
  /// [customerId] opens Checkout for a saved Razorpay customer so their tokenized cards are
  /// listed (paying with a saved card — RBI rules still require the CVV/OTP step).
  Future<RazorpayCheckoutResult> checkout({
    required String keyId,
    required String gatewayOrderId,
    required int amountMinor,
    required String currencyCode,
    required String description,
    String? customerId,
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
      if (customerId != null && customerId.isNotEmpty) 'customer_id': customerId,
    });

    return completer.future;
  }

  /// Tokenizes a card via the ₹1 setup order from `POST /payment-methods/setup`.
  /// `customer_id` + `save: 1` is what makes Razorpay store a token for the card; the backend
  /// reads the real token/card details from Razorpay and refunds the ₹1 on `/attach`.
  Future<RazorpayCheckoutResult> setupCard({
    required String keyId,
    required String customerId,
    required String gatewayOrderId,
    int amountMinor = 100,
    String currencyCode = 'INR',
    Map<String, dynamic>? prefill,
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
      finish(RazorpayCheckoutResult.failure('External wallets cannot be saved as a card.'));
    });

    razorpay.open({
      'key': keyId,
      'order_id': gatewayOrderId,
      'customer_id': customerId,
      'save': 1,
      'amount': amountMinor,
      'currency': currencyCode,
      'name': 'Ryva Ride',
      'description': 'Card verification (₹1, refunded)',
      'method': {'card': true, 'netbanking': false, 'upi': false, 'wallet': false},
      if (prefill != null)
        'prefill': {
          if (prefill['name'] != null) 'name': prefill['name'],
          if (prefill['email'] != null) 'email': prefill['email'],
          if (prefill['phone'] != null) 'contact': prefill['phone'],
        },
    });

    return completer.future;
  }
}
