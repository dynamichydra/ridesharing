import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBalancedEntries } from '../src/modules/ledger/ledger.service.js';
import { mockGateway } from '../src/modules/payment/gateways/mock.gateway.js';
import { convertMoneyWithRate } from '../src/modules/fx/fx.service.js';

test('Universal Payment System — Mock Gateway Order Lifecycle', async () => {
  const order = await mockGateway.createOrder({
    amountMinor: 50000,
    currencyCode: 'INR',
    metadata: { rideId: 'ride_test_123', riderId: 'rider_test_456' },
  });

  assert.ok(order.gatewayOrderId.startsWith('mock_order_'));
  assert.equal(order.amountMinor, 50000);
  assert.equal(order.currencyCode, 'INR');

  const verified = await mockGateway.verifyPayment({
    orderRef: order.gatewayOrderId,
    paymentRef: 'pay_mock_success',
    signature: 'valid_signature',
  });
  assert.equal(verified, true);

  const failed = await mockGateway.verifyPayment({
    orderRef: order.gatewayOrderId,
    paymentRef: 'pay_mock_failed',
    signature: 'fail_signature',
  });
  assert.equal(failed, false);
});

test('Universal Payment System — Split-Tender Ledger Balancing (Wallet + Promo + Card)', () => {
  // Total Ride: 500 INR
  // Sources: Promo (50 INR), Wallet (100 INR), Card/PSP (350 INR)
  // Destinations: Driver Payable (400 INR), Platform Commission (80 INR), Tax Payable (20 INR)
  const entries = [
    { accountId: 'promo_liability_acct', direction: 'debit', amountMinor: 5000, currencyCode: 'INR' },
    { accountId: 'rider_wallet_acct', direction: 'debit', amountMinor: 10000, currencyCode: 'INR' },
    { accountId: 'psp_clearing_acct', direction: 'debit', amountMinor: 35000, currencyCode: 'INR' },

    { accountId: 'driver_payable_acct', direction: 'credit', amountMinor: 40000, currencyCode: 'INR' },
    { accountId: 'platform_revenue_acct', direction: 'credit', amountMinor: 8000, currencyCode: 'INR' },
    { accountId: 'tax_payable_acct', direction: 'credit', amountMinor: 2000, currencyCode: 'INR' },
  ];

  const validation = validateBalancedEntries(entries);
  assert.equal(validation.balanced, true);
});

test('Universal Payment System — Corporate Ride Ledger Balancing', () => {
  // Corporate employee takes a 500 INR ride
  // Debit: Corporate Receivable (500 INR)
  // Credit: Driver Payable (400 INR), Platform Revenue (80 INR), Tax Payable (20 INR)
  const rideEntries = [
    { accountId: 'corp_receivable_acct', direction: 'debit', amountMinor: 50000, currencyCode: 'INR' },
    { accountId: 'driver_payable_acct', direction: 'credit', amountMinor: 40000, currencyCode: 'INR' },
    { accountId: 'platform_revenue_acct', direction: 'credit', amountMinor: 8000, currencyCode: 'INR' },
    { accountId: 'tax_payable_acct', direction: 'credit', amountMinor: 2000, currencyCode: 'INR' },
  ];
  assert.equal(validateBalancedEntries(rideEntries).balanced, true);

  // Corporate pays invoice at month-end: 500 INR
  // Debit: Bank Clearing (500 INR)
  // Credit: Corporate Receivable (500 INR)
  const invoiceEntries = [
    { accountId: 'bank_clearing_acct', direction: 'debit', amountMinor: 50000, currencyCode: 'INR' },
    { accountId: 'corp_receivable_acct', direction: 'credit', amountMinor: 50000, currencyCode: 'INR' },
  ];
  assert.equal(validateBalancedEntries(invoiceEntries).balanced, true);
});

test('Universal Payment System — Driver Incentive Ledger Balancing', () => {
  // Driver completes 20 rides bonus: 500 INR
  // Debit: Driver Incentive Expense (500 INR)
  // Credit: Driver Payable (500 INR)
  const incentiveEntries = [
    { accountId: 'incentive_expense_acct', direction: 'debit', amountMinor: 50000, currencyCode: 'INR' },
    { accountId: 'driver_payable_acct', direction: 'credit', amountMinor: 50000, currencyCode: 'INR' },
  ];
  assert.equal(validateBalancedEntries(incentiveEntries).balanced, true);
});

test('Universal Payment System — FX Conversion Minor Unit Calculations', () => {
  // 100 USD (10,000 cents) at rate 83.5 -> 835,000 paise (8,350 INR)
  const inrMinor = convertMoneyWithRate(10000, 83.5, 2, 2);
  assert.equal(inrMinor, 835000);

  // 100 USD at rate 150.0 to JPY (exponent 0) -> 15,000 JPY
  const jpyMinor = convertMoneyWithRate(10000, 150.0, 2, 0);
  assert.equal(jpyMinor, 15000);
});
