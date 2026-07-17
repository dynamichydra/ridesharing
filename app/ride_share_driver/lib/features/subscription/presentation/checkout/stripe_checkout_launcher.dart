import 'package:flutter_stripe/flutter_stripe.dart';

/// Thin wrapper around `flutter_stripe`'s PaymentSheet. The publishable key
/// is set per-checkout (returned fresh by `/subscriptions/initiate`) rather
/// than once at app startup, since this app has no other Stripe usage that
/// would need it earlier.
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
}
