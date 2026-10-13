import 'dart:developer' as developer;
import 'package:flutter_stripe/flutter_stripe.dart';

class StripeSetupResult {
  final bool success;
  final bool isCancelled;
  final String? errorMessage;

  const StripeSetupResult({
    required this.success,
    this.isCancelled = false,
    this.errorMessage,
  });
}

class StripeCheckoutLauncher {
  Future<bool> checkout({
    required String clientSecret,
    required String publishableKey,
  }) async {
    try {
      Stripe.publishableKey = publishableKey;
      await Stripe.instance.applySettings();

      await Stripe.instance.initPaymentSheet(
        paymentSheetParameters: SetupPaymentSheetParameters(
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: 'Ryva Ride',
        ),
      );

      await Stripe.instance.presentPaymentSheet();
      return true;
    } on StripeException catch (e) {
      developer.log('[StripeCheckoutLauncher] StripeException during checkout: ${e.error.localizedMessage}');
      return false;
    } catch (e) {
      developer.log('[StripeCheckoutLauncher] General exception during checkout: $e');
      return false;
    }
  }

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
      developer.log('[StripeCheckoutLauncher] StripeException during setup: ${e.error.localizedMessage}');
      if (e.error.code == FailureCode.Canceled) {
        return const StripeSetupResult(
          success: false,
          isCancelled: true,
          errorMessage: 'Card setup was cancelled.',
        );
      }
      return StripeSetupResult(
        success: false,
        errorMessage: e.error.localizedMessage ?? 'Card setup failed with Stripe.',
      );
    } catch (e) {
      developer.log('[StripeCheckoutLauncher] Unexpected error during setup: $e');
      return StripeSetupResult(
        success: false,
        errorMessage: e.toString(),
      );
    }
  }
}
