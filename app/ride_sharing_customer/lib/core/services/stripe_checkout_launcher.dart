import 'package:flutter_stripe/flutter_stripe.dart';

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
        merchantDisplayName: 'Ryva Ride',
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
