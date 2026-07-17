import 'active_subscription.dart';

/// `POST /subscriptions/initiate` returns one of three distinct shapes
/// depending on server-side gateway configuration (see
/// `backend/src/modules/subscription/subscription.service.js`) — modeled as
/// a sealed hierarchy so the Bloc/UI is forced to handle every case.
sealed class InitiateSubscriptionResult {
  const InitiateSubscriptionResult();
}

/// No payment gateway is configured for this plan's currency server-side
/// (dev mode) — the subscription was activated immediately, no checkout
/// needed.
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

  const RazorpayCheckoutRequired({
    required this.gatewayOrderId,
    required this.keyId,
    required this.amountMinor,
    required this.currencyCode,
    required this.paymentAttemptId,
    required this.planName,
  });
}

class StripeCheckoutRequired extends InitiateSubscriptionResult {
  final String gatewayOrderId;
  final String clientSecret;
  final String publishableKey;
  final String paymentAttemptId;
  final String planName;

  const StripeCheckoutRequired({
    required this.gatewayOrderId,
    required this.clientSecret,
    required this.publishableKey,
    required this.paymentAttemptId,
    required this.planName,
  });
}
