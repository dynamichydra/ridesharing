import 'active_subscription.dart';

/// `POST /subscriptions/initiate` returns one of three distinct shapes
/// depending on server-side gateway configuration (see
/// `backend/src/modules/subscription/subscription.service.js`) — modeled as
/// a sealed hierarchy so the Bloc/UI is forced to handle every case.
sealed class InitiateSubscriptionResult {
  const InitiateSubscriptionResult();
}

/// The subscription was activated immediately, no checkout needed — either a
/// saved card was charged successfully, or (dev mode) no payment gateway is
/// configured for this plan's currency server-side.
class SubscriptionAlreadyActive extends InitiateSubscriptionResult {
  final ActiveSubscription subscription;
  const SubscriptionAlreadyActive(this.subscription);
}

class RazorpayCheckoutRequired extends InitiateSubscriptionResult {
  final String gatewayOrderId;
  final String keyId;

  /// Reconstructed from the backend's display-formatted major-unit `amount`
  /// field as `round(amount * 100)`. Exact for every currency this backend
  /// currently supports (INR/CAD/USD all use 2 decimal places per
  /// `utils/money.js`'s `CURRENCY_EXPONENT` map) — the backend doesn't
  /// return the raw minor-unit amount on this endpoint. Would need a real
  /// `amountMinor` field added server-side if a 0- or 3-decimal currency
  /// gateway is ever introduced.
  final int amountMinor;
  final String currencyCode;
  final String paymentAttemptId;
  final String planName;

  /// Set when paying with a saved Razorpay card — Checkout is opened for this customer so
  /// the saved card is listed (the payer still confirms with CVV/OTP).
  final String? customerId;

  const RazorpayCheckoutRequired({
    required this.gatewayOrderId,
    required this.keyId,
    required this.amountMinor,
    required this.currencyCode,
    required this.paymentAttemptId,
    required this.planName,
    this.customerId,
  });
}

class StripeCheckoutRequired extends InitiateSubscriptionResult {
  final String gatewayOrderId;
  final String clientSecret;
  final String publishableKey;
  final String paymentAttemptId;
  final String planName;

  /// True when a saved card was charged off-session and the bank asked for 3DS — the app
  /// only runs the authentication step instead of showing a fresh PaymentSheet.
  final bool requiresAction;

  const StripeCheckoutRequired({
    required this.gatewayOrderId,
    required this.clientSecret,
    required this.publishableKey,
    required this.paymentAttemptId,
    required this.planName,
    this.requiresAction = false,
  });
}
