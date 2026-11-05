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

test('Driver without a subscription pays the 15% default commission, cash promo breakdown', () => {
  const grossFareMinor = 50000;
  const promoDiscountMinor = 10000;
  const platformSubsidyMinor = 10000;
  const riderPaysMinor = grossFareMinor - promoDiscountMinor; // 40000

  // No configured non-subscriber rate → commission-defaults.js: 15% free / 5% with a plan.
  const commNonSubscribed = computeCommission({
    finalFareMinor: grossFareMinor,
    isSubscriber: false,
    rule: {
      minCommissionMinor: null,
      maxCommissionMinor: null,
      bookingFeeMinor: 0,
      name: 'Platform default',
    },
  });

  assert.equal(commNonSubscribed.commissionMinor, 7500); // 15% of 50,000 = 7,500
  assert.equal(commNonSubscribed.driverEarningsMinor, 42500); // 50,000 - 7,500 = 42,500

  // Cash Ride:
  const collectFromCustomerMinor = riderPaysMinor; // 40,000 in cash
  const netDueToPlatform = commNonSubscribed.commissionMinor - platformSubsidyMinor; // 7,500 - 10,000 = -2,500
  const walletCreditMinor = Math.max(0, -netDueToPlatform); // 2,500 — platform owes the driver the rest of the promo
  const walletDebitMinor = Math.max(0, netDueToPlatform); // 0

  assert.equal(collectFromCustomerMinor, 40000); // Collect ₹400 in cash
  assert.equal(walletCreditMinor, 2500);
  assert.equal(walletDebitMinor, 0);
  // Total driver take-home: 40,000 cash + 2,500 wallet credit = 42,500, exactly matching driver earnings
});
