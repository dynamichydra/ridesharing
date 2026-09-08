import test from 'node:test';
import assert from 'node:assert/strict';
import { listAvailablePromosForUser, validatePromoCode } from '../src/modules/promo/promo.service.js';
import { computeCommission } from '../src/modules/commission/commission.service.js';

test('Driver cash promo vs wallet breakdown calculation', () => {
  // Scenario A: Metered fare ₹500 (50,000 minor), ₹100 promo (10,000 minor)
  // Subscribed driver with 0% commission
  const grossFareMinor = 50000;
  const promoDiscountMinor = 10000;
  const platformSubsidyMinor = 10000;
  const riderPaysMinor = grossFareMinor - promoDiscountMinor; // 40000

  const commSubscribed = computeCommission({
    finalFareMinor: grossFareMinor,
    isSubscriber: true,
    customRate: 0,
    waiveBookingFee: true,
  });

  assert.equal(commSubscribed.commissionMinor, 0);
  assert.equal(commSubscribed.driverEarningsMinor, 50000);

  // Cash Ride:
  const isCash = true;
  const collectFromCustomerMinor = isCash ? riderPaysMinor : 0;
  const walletCreditMinor = isCash
    ? Math.max(0, platformSubsidyMinor - commSubscribed.commissionMinor)
    : commSubscribed.driverEarningsMinor;

  assert.equal(collectFromCustomerMinor, 40000); // Take ₹400 in cash from passenger
  assert.equal(walletCreditMinor, 10000); // ₹100 platform promo subsidy credited to driver wallet
  assert.equal(collectFromCustomerMinor + walletCreditMinor, 50000); // Driver gets full ₹500 earnings

  // Wallet / Online Ride:
  const isOnline = false;
  const collectFromCustomerOnline = isOnline ? riderPaysMinor : 0;
  const walletCreditOnline = isOnline
    ? Math.max(0, platformSubsidyMinor - commSubscribed.commissionMinor)
    : commSubscribed.driverEarningsMinor;

  assert.equal(collectFromCustomerOnline, 0); // Do NOT collect cash
  assert.equal(walletCreditOnline, 50000); // ₹500 credited to driver wallet
});

test('Driver non-subscriber 20% commission with cash promo breakdown', () => {
  const grossFareMinor = 50000;
  const promoDiscountMinor = 10000;
  const platformSubsidyMinor = 10000;
  const riderPaysMinor = grossFareMinor - promoDiscountMinor; // 40000

  const commNonSubscribed = computeCommission({
    finalFareMinor: grossFareMinor,
    isSubscriber: false,
    rule: {
      rate: 0.20,
      minCommissionMinor: null,
      maxCommissionMinor: null,
      bookingFeeMinor: 0,
      name: 'Standard 20%',
    },
  });

  assert.equal(commNonSubscribed.commissionMinor, 10000); // 20% of 50,000 = 10,000
  assert.equal(commNonSubscribed.driverEarningsMinor, 40000); // 50,000 - 10,000 = 40,000

  // Cash Ride:
  const collectFromCustomerMinor = riderPaysMinor; // 40,000 in cash
  const netDueToPlatform = commNonSubscribed.commissionMinor - platformSubsidyMinor; // 10,000 - 10,000 = 0
  const walletCreditMinor = Math.max(0, -netDueToPlatform); // 0
  const walletDebitMinor = Math.max(0, netDueToPlatform); // 0

  assert.equal(collectFromCustomerMinor, 40000); // Collect ₹400 in cash
  assert.equal(walletCreditMinor, 0);
  assert.equal(walletDebitMinor, 0);
  // Total driver take-home: 40000 cash - 0 wallet debit = 40000, exactly matching driver earnings
});
