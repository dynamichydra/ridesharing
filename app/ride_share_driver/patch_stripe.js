const fs = require('fs');
const path = require('path');

const p = path.resolve('lib/features/subscription/presentation/checkout/stripe_checkout_launcher.dart');
const content = fs.readFileSync(p, 'utf8');

const newContent = content.replace(
  `    try {
      await Stripe.instance.presentPaymentSheet();
      return true;
    } on StripeException {
      return false;
    }
  }`,
  `    try {
      await Stripe.instance.presentPaymentSheet();
      return true;
    } on StripeException {
      return false;
    }
  }

  Future<bool> setupPaymentSheet({
    required String setupIntentClientSecret,
    required String publishableKey,
  }) async {
    Stripe.publishableKey = publishableKey;
    await Stripe.instance.applySettings();

    await Stripe.instance.initPaymentSheet(
      paymentSheetParameters: SetupPaymentSheetParameters(
        setupIntentClientSecret: setupIntentClientSecret,
        merchantDisplayName: 'Ryva Ride',
      ),
    );

    try {
      await Stripe.instance.presentPaymentSheet();
      return true;
    } on StripeException {
      return false;
    }
  }`
);

fs.writeFileSync(p, newContent);
