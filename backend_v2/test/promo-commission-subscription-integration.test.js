import 'dotenv/config';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { computeCommission } from '../src/modules/commission/commission.service.js';
import { validateBalancedEntries } from '../src/modules/ledger/ledger.service.js';

describe('End-to-End Integration: Promo Code + Commission + Subscription Engine', () => {

  test('Scenario 1: Subscribed Rider Discount + Promo Code + Non-Subscribed Driver (20% Commission)', () => {
    // 1. Initial Metered Base/Trip Fare: ₹1000.00 (100,000 minor)
    const grossFareMinor = 100000;

    // 2. Rider Subscription Benefit: 10% Off all rides
    const riderSubscriptionDiscountPct = 10;
    const riderSubDiscountMinor = Math.round(grossFareMinor * (riderSubscriptionDiscountPct / 100)); // ₹100.00 (10,000)
    const fareAfterSubMinor = grossFareMinor - riderSubDiscountMinor; // ₹900.00 (90,000)

    // 3. Promo Code Applied: 20% Off capped at ₹100.00 (10,000 minor)
    const rawPromoDiscount = Math.round(fareAfterSubMinor * 0.20); // 18,000 minor
    const promoCapMinor = 10000; // Capped at ₹100.00
    const promoDiscountMinor = Math.min(rawPromoDiscount, promoCapMinor); // 10,000 minor

    // 4. Final Rider Payable:
    const finalRiderPayableMinor = fareAfterSubMinor - promoDiscountMinor; // ₹800.00 (80,000 minor)
    assert.equal(finalRiderPayableMinor, 80000);

    // 5. Driver Commission Calculation:
    // Driver earnings are protected against platform discounts; calculated against gross or pre-discount base
    const commissionRule = {
      bookingFeeMinor: 2000,      // ₹20 booking fee
      nonSubscriberRate: '0.20',  // 20% platform cut
      subscriberRate: '0.05',
    };

    const commissionResult = computeCommission({
      finalFareMinor: grossFareMinor,
      rule: commissionRule,
      isSubscriber: false,
    });

    // Commission = 2000 + 0.20 * (100000 - 2000) = 2000 + 19600 = 21600 (₹216.00)
    // Driver Take-Home = 100000 - 21600 = 78400 (₹784.00)
    assert.equal(commissionResult.commissionMinor, 21600);
    assert.equal(commissionResult.driverEarningsMinor, 78400);

    // 6. Double-Entry Accounting Verification:
    // Total Credits = Driver Earnings (78,400) + Platform Commission Revenue (21,600) = 100,000
    // Total Debits = Rider Payment Clearing (80,000) + Platform Marketing/Promo Subsidy (10,000) + Platform Rider Sub Discount (10,000) = 100,000
    const ledgerEntries = [
      { direction: 'debit', amountMinor: finalRiderPayableMinor, currencyCode: 'INR', note: 'Rider Card/UPI Settlement' },
      { direction: 'debit', amountMinor: promoDiscountMinor, currencyCode: 'INR', note: 'Marketing Promo Subsidy' },
      { direction: 'debit', amountMinor: riderSubDiscountMinor, currencyCode: 'INR', note: 'Rider Subscription Subsidy' },
      { direction: 'credit', amountMinor: commissionResult.driverEarningsMinor, currencyCode: 'INR', note: 'Driver Payable Liability' },
      { direction: 'credit', amountMinor: commissionResult.commissionMinor, currencyCode: 'INR', note: 'Platform Commission Revenue' },
    ];

    const validation = validateBalancedEntries(ledgerEntries);
    assert.equal(validation.balanced, true, 'Double-entry ledger MUST be strictly balanced');
  });

  test('Scenario 2: Promo Code + Subscribed Driver (0% Commission Tier with Flat Booking Fee)', () => {
    // Gross Fare = $50.00 (5000 minor)
    const grossFareMinor = 5000;
    // Promo = $10.00 (1000 minor)
    const promoDiscountMinor = 1000;
    const finalRiderPayableMinor = 4000; // $40.00

    // Driver has VIP 0% Commission Plan (Booking fee only: $2.00 / 200 minor)
    const commissionRule = {
      bookingFeeMinor: 200,
      nonSubscriberRate: '0.25',
      subscriberRate: '0.00', // 0% commission entitlement for active subscriber
    };

    const commissionResult = computeCommission({
      finalFareMinor: grossFareMinor,
      rule: commissionRule,
      isSubscriber: true,
    });

    assert.equal(commissionResult.commissionMinor, 200);        // Only booking fee
    assert.equal(commissionResult.driverEarningsMinor, 4800);    // $48.00 Take-Home

    // Ledger balancing
    const ledgerEntries = [
      { direction: 'debit', amountMinor: finalRiderPayableMinor, currencyCode: 'USD' },  // 4000
      { direction: 'debit', amountMinor: promoDiscountMinor, currencyCode: 'USD' },      // 1000
      { direction: 'credit', amountMinor: commissionResult.driverEarningsMinor, currencyCode: 'USD' }, // 4800
      { direction: 'credit', amountMinor: commissionResult.commissionMinor, currencyCode: 'USD' },     // 200
    ];

    const validation = validateBalancedEntries(ledgerEntries);
    assert.equal(validation.balanced, true);
    
    const totalDebits = ledgerEntries.filter(e => e.direction === 'debit').reduce((sum, e) => sum + e.amountMinor, 0);
    const totalCredits = ledgerEntries.filter(e => e.direction === 'credit').reduce((sum, e) => sum + e.amountMinor, 0);
    assert.equal(totalDebits, 5000);
    assert.equal(totalCredits, 5000);
  });

  test('Scenario 3: Cash Trip with Promo Code & Driver Subscription Commission Settlement', () => {
    // Gross Fare = ₹600.00 (60,000 minor)
    const grossFareMinor = 60000;
    // Rider applies ₹100.00 promo discount (10,000 minor)
    const promoDiscountMinor = 10000;

    // Subscribed Driver (5% commission rate + ₹20 booking fee):
    // Booking fee = 2000
    // Remainder = 58000
    // 5% cut = 2900
    // Platform Commission = 4900
    // Driver Earnings = 60000 - 4900 = 55100 (₹551.00)
    const commissionRule = {
      bookingFeeMinor: 2000,
      nonSubscriberRate: '0.20',
      subscriberRate: '0.05',
    };

    const commissionResult = computeCommission({
      finalFareMinor: grossFareMinor,
      rule: commissionRule,
      isSubscriber: true,
    });

    assert.equal(commissionResult.commissionMinor, 4900);
    assert.equal(commissionResult.driverEarningsMinor, 55100);

    // Net settlement calculation:
    // Driver received ₹500 cash in hand, but earned ₹551.
    // Platform owes driver ₹51.00 (5,100 minor) which is credited to driver wallet.
    // Alternatively: Promo Subsidy (₹100) - Commission (₹49) = +₹51 Net Platform Payout to Driver Wallet.
    const netPlatformPayoutToDriverMinor = promoDiscountMinor - commissionResult.commissionMinor; // 5100
    assert.equal(netPlatformPayoutToDriverMinor, 5100);

    // In ledger:
    // Platform records marketing subsidy expense and credits driver liability:
    const cashSettlementEntries = [
      { direction: 'debit', amountMinor: promoDiscountMinor, currencyCode: 'INR', note: 'Platform Marketing Subsidy' },
      { direction: 'credit', amountMinor: commissionResult.commissionMinor, currencyCode: 'INR', note: 'Platform Commission Earned' },
      { direction: 'credit', amountMinor: netPlatformPayoutToDriverMinor, currencyCode: 'INR', note: 'Driver Wallet Credit' },
    ];

    const validation = validateBalancedEntries(cashSettlementEntries);
    assert.equal(validation.balanced, true);
    
    const totalDebits = cashSettlementEntries.filter(e => e.direction === 'debit').reduce((sum, e) => sum + e.amountMinor, 0);
    const totalCredits = cashSettlementEntries.filter(e => e.direction === 'credit').reduce((sum, e) => sum + e.amountMinor, 0);
    assert.equal(totalDebits, 10000);
    assert.equal(totalCredits, 10000);
  });

  test('Scenario 4: Split-Tender (Wallet + Card) with Promo Code + Tiered Commission', () => {
    const grossFareMinor = 120000; // $120.00
    const promoDiscountMinor = 20000; // $20.00 Promo
    const riderPayableMinor = 100000; // $100.00

    // Rider pays $30 from Wallet, $70 from Card
    const walletPaymentMinor = 30000;
    const cardPaymentMinor = 70000;
    assert.equal(walletPaymentMinor + cardPaymentMinor, riderPayableMinor);

    // Standard Driver commission
    const commissionRule = {
      bookingFeeMinor: 500,
      nonSubscriberRate: '0.15',
      subscriberRate: '0.05',
    };

    const commissionResult = computeCommission({
      finalFareMinor: grossFareMinor,
      rule: commissionRule,
      isSubscriber: false,
    });

    // Remainder = 120000 - 500 = 119500
    // Variable = 119500 * 0.15 = 17925
    // Commission = 17925 + 500 = 18425
    // Driver = 120000 - 18425 = 101575
    assert.equal(commissionResult.commissionMinor, 18425);
    assert.equal(commissionResult.driverEarningsMinor, 101575);

    const splitLedgerEntries = [
      { direction: 'debit', amountMinor: walletPaymentMinor, currencyCode: 'USD', note: 'Rider Wallet Debit' },
      { direction: 'debit', amountMinor: cardPaymentMinor, currencyCode: 'USD', note: 'Stripe Card Clearing' },
      { direction: 'debit', amountMinor: promoDiscountMinor, currencyCode: 'USD', note: 'Promo Subsidy' },
      { direction: 'credit', amountMinor: commissionResult.driverEarningsMinor, currencyCode: 'USD', note: 'Driver Wallet Credit' },
      { direction: 'credit', amountMinor: commissionResult.commissionMinor, currencyCode: 'USD', note: 'Platform Revenue' },
    ];

    const validation = validateBalancedEntries(splitLedgerEntries);
    assert.equal(validation.balanced, true);
    
    const totalDebits = splitLedgerEntries.filter(e => e.direction === 'debit').reduce((sum, e) => sum + e.amountMinor, 0);
    const totalCredits = splitLedgerEntries.filter(e => e.direction === 'credit').reduce((sum, e) => sum + e.amountMinor, 0);
    assert.equal(totalDebits, 120000);
    assert.equal(totalCredits, 120000);
  });

});
