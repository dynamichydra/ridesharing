/**
 * Base Payment Gateway Interface contract.
 * All payment provider adapters (Razorpay, Stripe, Cashfree, Mock) must implement these methods.
 */
export class BasePaymentGateway {
  constructor(name) {
    this.name = name;
    this.isConfigured = false;
    this.supportsPayouts = false;
  }

  async createPaymentIntent(input) {
    throw new Error(`createPaymentIntent not implemented for ${this.name}`);
  }

  async createOrder(input) {
    throw new Error(`createOrder not implemented for ${this.name}`);
  }

  async verifyPayment(input) {
    throw new Error(`verifyPayment not implemented for ${this.name}`);
  }

  async fetchPayment(gatewayPaymentId) {
    throw new Error(`fetchPayment not implemented for ${this.name}`);
  }

  async refundPayment(input) {
    throw new Error(`refundPayment not implemented for ${this.name}`);
  }

  async createTransfer(input) {
    throw new Error(`createTransfer not implemented for ${this.name}`);
  }

  async verifyWebhook(input) {
    throw new Error(`verifyWebhook not implemented for ${this.name}`);
  }
}
