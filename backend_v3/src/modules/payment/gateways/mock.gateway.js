import { BasePaymentGateway } from './base.gateway.js';

export class MockPaymentGateway extends BasePaymentGateway {
  constructor() {
    super('mock');
    this.isConfigured = true;
    this.supportsPayouts = true;
  }

  async createOrder({ amountMinor, currencyCode, metadata = {} }) {
    return {
      gatewayOrderId: `mock_order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      amountMinor,
      currencyCode,
      metadata,
    };
  }

  async createPaymentIntent(input) {
    return this.createOrder(input);
  }

  async verifyPayment({ orderRef, paymentRef, signature }) {
    if (signature === 'fail_signature' || paymentRef === 'pay_mock_failed') {
      return false;
    }
    return true;
  }

  async fetchPayment(gatewayPaymentId) {
    return {
      id: gatewayPaymentId,
      status: 'captured',
      amountMinor: 50000,
      currencyCode: 'INR',
    };
  }

  async refundPayment({ paymentId, amountMinor, reason }) {
    return {
      refundId: `mock_rfnd_${Date.now()}`,
      paymentId,
      amountMinor,
      status: 'processed',
      reason,
    };
  }

  async createTransfer({ accountId, amountMinor, currencyCode }) {
    return {
      transferId: `mock_trf_${Date.now()}`,
      accountId,
      amountMinor,
      currencyCode,
      status: 'processed',
    };
  }

  async verifyWebhook({ payload, signature }) {
    return true;
  }
}

export const mockGateway = new MockPaymentGateway();
