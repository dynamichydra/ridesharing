/**
 * Base Abstract Gateway Adapter for Payment & Payout Providers.
 * Every gateway (Stripe, Razorpay, PayPal, Flutterwave, etc.) implements this contract.
 */
export class BaseGatewayAdapter {
  constructor(name) {
    if (new.target === BaseGatewayAdapter) {
      throw new TypeError('Cannot construct BaseGatewayAdapter instances directly');
    }
    this.name = name;
  }

  get isConfigured() {
    return false;
  }

  get supportsPayouts() {
    return false;
  }

  /**
   * Onboarding style:
   * - 'hosted_redirect': Provider hosts KYC and bank collection (e.g. Stripe Connect Express, PayPal Commerce)
   * - 'direct_bank_form': In-app form submission (e.g. RazorpayX, Direct Bank Transfer)
   * - 'mobile_wallet': Phone / mobile money collection (e.g. M-Pesa)
   */
  get onboardingType() {
    return 'direct_bank_form';
  }

  /**
   * Returns UI setup schema for driver mobile app or admin portal.
   * @param {Object} context - { countryCode, currencyCode, driver }
   * @returns {Object} { type: string, requiredFields?: string[], supportedCurrencies?: string[], description?: string }
   */
  getSetupFormSchema(context = {}) {
    return {
      gateway: this.name,
      type: this.onboardingType,
      requiredFields: [],
    };
  }

  /**
   * Handles driver payout account setup.
   * For hosted_redirect: creates connected account and returns { url, externalAccountId, status }.
   * For direct_bank_form: creates contact/fund account, validates bank details, returns { externalAccountId, isAutoVerified, status }.
   */
  async setupPayoutAccount(driver, data = {}, options = {}) {
    throw new Error(`setupPayoutAccount() not implemented for gateway ${this.name}`);
  }

  /**
   * Executes a payout transfer.
   */
  async executePayout({ destinationId, amountMinor, currencyCode, idempotencyKey, metadata }) {
    throw new Error(`executePayout() not implemented for gateway ${this.name}`);
  }

  /**
   * Parses and validates incoming webhook payloads.
   */
  parseWebhookEvent(rawBody, signature) {
    throw new Error(`parseWebhookEvent() not implemented for gateway ${this.name}`);
  }

  /**
   * Verifies incoming webhook signature.
   */
  verifyWebhookSignature(rawBody, signature) {
    return false;
  }
}
