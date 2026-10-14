import 'package:flutter_stripe/flutter_stripe.dart';

class StripeSetupResult {
  final bool success;
  final bool isCancelled;
  final String? errorMessage;

  const StripeSetupResult({required this.success, this.isCancelled = false, this.errorMessage});
}

/// Thin wrapper around `flutter_stripe`. The publishable key is set per call (returned fresh
/// by the backend with every intent) rather than once at app startup.
class StripeCheckoutLauncher {
  Future<bool> checkout({
    required String clientSecret,
    required String publishableKey,
  }) async {
    Stripe.publishableKey = publishableKey;
    await Stripe.instance.applySettings();

    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Ride Share Driver',
      ),
    );

    try {
      await Stripe.instance.presentPaymentSheet();
      return true;
    } on StripeException {
      return false;
    }
  }

  /// Collects and tokenizes a card against a SetupIntent from `POST /payment-methods/setup`.
  Future<StripeSetupResult> setupPaymentSheet({
    required String setupIntentClientSecret,
    required String publishableKey,
  }) async {
    try {
      Stripe.publishableKey = publishableKey;
      await Stripe.instance.applySettings();

      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          setupIntentClientSecret: setupIntentClientSecret,
          merchantDisplayName: 'Ryva Ride',
        ),
      );

      await Stripe.instance.presentPaymentSheet();
      return const StripeSetupResult(success: true);
    } on StripeException catch (e) {
      if (e.error.code == FailureCode.Canceled) {
        return const StripeSetupResult(success: false, isCancelled: true, errorMessage: 'Card setup was cancelled.');
      }
      return StripeSetupResult(success: false, errorMessage: e.error.localizedMessage ?? 'Card setup failed.');
    } catch (e) {
      return StripeSetupResult(success: false, errorMessage: e.toString());
    }
  }

  /// Finishes a saved-card charge the backend confirmed off-session but the bank wants
  /// authenticated (3DS) — the PaymentIntent already carries the saved card, so this only
  /// runs the authentication step. Returns true once the intent has succeeded.
  Future<bool> handleNextAction({
    required String clientSecret,
    required String publishableKey,
  }) async {
    try {
      Stripe.publishableKey = publishableKey;
      await Stripe.instance.applySettings();
      final intent = await Stripe.instance.handleNextAction(clientSecret);
      return intent.status == PaymentIntentsStatus.Succeeded ||
          intent.status == PaymentIntentsStatus.RequiresCapture;
    } on StripeException {
      return false;
    }
  }
}
