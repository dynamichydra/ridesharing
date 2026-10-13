import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/config/db.js';
import {
  users,
  countries,
  rides,
  vehicleTypes,
  paymentMethods,
  payments,
} from '../drizzle/schema/index.js';
import {
  resolvePaymentRegion,
  evaluatePaymentMethodEligibility,
  resolveCustomerPaymentOptions,
  getMerchantAccountId,
} from '../src/modules/payment/payment-region.service.js';
import {
  savePaymentMethod,
  listPaymentMethods,
  setPreferredPaymentMethod,
  removePaymentMethod,
  getPaymentMethodById,
} from '../src/modules/payment-method/payment-method.service.js';
import { initiateRidePayment } from '../src/modules/ride-payment/ride-payment.service.js';
import { eq, and } from 'drizzle-orm';

describe('Region-Aware Saved Payment Methods & Roaming Customer Suite', () => {
  let testUserA;
  let testUserB;
  let indiaCountry;
  let canadaCountry;
  let vehicleType;
  let rideInIndia;
  let rideInCanada;

  before(async () => {
    // 1. Fetch countries
    [indiaCountry] = await db.select().from(countries).where(eq(countries.isoCode, 'IN')).limit(1);
    [canadaCountry] = await db.select().from(countries).where(eq(countries.isoCode, 'CA')).limit(1);

    // 2. Fetch vehicle type
    [vehicleType] = await db.select().from(vehicleTypes).limit(1);

    // 3. Create test users
    const [uA] = await db.insert(users).values({
      phone: `+9198${Date.now().toString().slice(-8)}`,
      name: 'Roaming Tester A',
      email: `roaming_a_${Date.now()}@example.com`,
      role: 'rider',
      countryId: indiaCountry?.id,
    }).returning();
    testUserA = uA;

    const [uB] = await db.insert(users).values({
      phone: `+1604${Date.now().toString().slice(-7)}`,
      name: 'Roaming Tester B',
      email: `roaming_b_${Date.now()}@example.com`,
      role: 'rider',
      countryId: canadaCountry?.id,
    }).returning();
    testUserB = uB;

    // 4. Create test rides: one in India (INR) and one in Canada (CAD)
    if (vehicleType && indiaCountry) {
      const [rIN] = await db.insert(rides).values({
        riderId: testUserA.id,
        vehicleTypeId: vehicleType.id,
        countryId: indiaCountry.id,
        currencyCode: 'INR',
        pickupLat: '12.9716',
        pickupLng: '77.5946',
        dropLat: '12.9352',
        dropLng: '77.6245',
        finalFareMinor: 35000, // 350 INR
        status: 'completed',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
      }).returning();
      rideInIndia = rIN;
    }

    if (vehicleType && canadaCountry) {
      const [rCA] = await db.insert(rides).values({
        riderId: testUserA.id,
        vehicleTypeId: vehicleType.id,
        countryId: canadaCountry.id,
        currencyCode: 'CAD',
        pickupLat: '43.6532',
        pickupLng: '-79.3832',
        dropLat: '43.6426',
        dropLng: '-79.3871',
        finalFareMinor: 2500, // 25.00 CAD
        status: 'completed',
        paymentMethod: 'cash',
        paymentStatus: 'pending',
      }).returning();
      rideInCanada = rCA;
    }
  });

  after(async () => {
    // Cleanup created test records
    if (rideInIndia) {
      await db.delete(payments).where(eq(payments.rideId, rideInIndia.id));
      await db.delete(rides).where(eq(rides.id, rideInIndia.id));
    }
    if (rideInCanada) {
      await db.delete(payments).where(eq(payments.rideId, rideInCanada.id));
      await db.delete(rides).where(eq(rides.id, rideInCanada.id));
    }
    if (testUserA) {
      await db.delete(paymentMethods).where(eq(paymentMethods.userId, testUserA.id));
      await db.delete(users).where(eq(users.id, testUserA.id));
    }
    if (testUserB) {
      await db.delete(paymentMethods).where(eq(paymentMethods.userId, testUserB.id));
      await db.delete(users).where(eq(users.id, testUserB.id));
    }
  });

  // ── 1. Regional Payment Configuration Resolution ─────────────────────────────
  it('1. Authoritative Region Resolution for India and Canada', async () => {
    // Resolve for India
    const configIN = await resolvePaymentRegion({ countryCode: 'IN', currencyCode: 'INR' });
    assert.equal(configIN.region.countryCode, 'IN');
    assert.equal(configIN.currencyCode, 'INR');
    assert.ok(configIN.availableGateways.some(g => g.gateway === 'razorpay'));
    assert.ok(configIN.allowedPaymentMethods.includes('upi'));

    // Resolve for Canada
    const configCA = await resolvePaymentRegion({ countryCode: 'CA', currencyCode: 'CAD' });
    assert.equal(configCA.region.countryCode, 'CA');
    assert.equal(configCA.currencyCode, 'CAD');
    assert.ok(configCA.availableGateways.some(g => g.gateway === 'stripe'));
    assert.ok(configCA.allowedPaymentMethods.includes('apple_pay'));
  });

  it('2. Authoritative Region Resolution derived from Ride Object', async () => {
    if (!rideInIndia || !rideInCanada) return;
    const configRideIN = await resolvePaymentRegion({ rideId: rideInIndia.id, riderId: testUserA.id });
    assert.equal(configRideIN.currencyCode, 'INR');
    assert.equal(configRideIN.amountMinor, 35000);

    const configRideCA = await resolvePaymentRegion({ rideId: rideInCanada.id, riderId: testUserA.id });
    assert.equal(configRideCA.currencyCode, 'CAD');
    assert.equal(configRideCA.amountMinor, 2500);
  });

  // ── 2. Duplicate Prevention ──────────────────────────────────────────────────
  it('3. Duplicate Prevention — Repeated Save Requests return existing record without duplicate', async () => {
    const cardData = {
      userId: testUserA.id,
      gateway: 'stripe',
      paymentMethodToken: 'pm_test_token_unique_123',
      last4: '4242',
      cardBrand: 'Visa',
      expiryMonth: '12',
      expiryYear: '2028',
      fingerprint: 'fp_card_abc123',
      merchantAccountId: getMerchantAccountId('stripe'),
      isDefault: true,
    };

    const firstSave = await savePaymentMethod(cardData);
    assert.ok(firstSave.id);
    assert.equal(firstSave.isDefault, true);

    // Repeated save request with same token
    const secondSave = await savePaymentMethod(cardData);
    assert.equal(secondSave.id, firstSave.id, 'Should return the identical payment method ID');
    assert.equal(secondSave.duplicatePrevented, true);

    // Verify only 1 record exists in DB
    const list = await db.select().from(paymentMethods).where(eq(paymentMethods.userId, testUserA.id));
    assert.equal(list.length, 1);
  });

  it('4. Duplicate Prevention — Different Token with Same Canonical Fingerprint is detected', async () => {
    const cardData2 = {
      userId: testUserA.id,
      gateway: 'stripe',
      paymentMethodToken: 'pm_different_token_same_card_456',
      last4: '4242',
      cardBrand: 'Visa',
      expiryMonth: '12',
      expiryYear: '2028',
      fingerprint: 'fp_card_abc123', // Same physical card fingerprint!
      merchantAccountId: getMerchantAccountId('stripe'),
      isDefault: false,
    };

    const duplicateCardSave = await savePaymentMethod(cardData2);
    assert.equal(duplicateCardSave.duplicatePrevented, true);

    // Still only 1 record in DB
    const list = await db.select().from(paymentMethods).where(eq(paymentMethods.userId, testUserA.id));
    assert.equal(list.length, 1);
  });

  it('5. Duplicate Prevention — Concurrent Save Requests Race Condition Handled Gracefully', async () => {
    const token = `pm_concurrent_${Date.now()}`;
    const cardPayload = {
      userId: testUserA.id,
      gateway: 'razorpay',
      paymentMethodToken: token,
      last4: '1111',
      cardBrand: 'Mastercard',
      expiryMonth: '08',
      expiryYear: '2029',
      fingerprint: `fp_rzp_${Date.now()}`,
      merchantAccountId: getMerchantAccountId('razorpay'),
      isDefault: false,
    };

    // Run parallel concurrent save requests
    const [res1, res2] = await Promise.all([
      savePaymentMethod(cardPayload),
      savePaymentMethod(cardPayload),
    ]);

    assert.ok(res1.id);
    assert.ok(res2.id);
    assert.equal(res1.id, res2.id, 'Both concurrent requests must resolve to the same record ID');
  });

  // ── 3. Roaming & Eligibility Evaluation ──────────────────────────────────────
  it('6. Roaming Customer — Canadian Stripe Card is Ineligible in India (INR)', async () => {
    const stripeMethod = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.userId, testUserA.id), eq(paymentMethods.gateway, 'stripe')))
      .limit(1)
      .then(r => r[0]);

    assert.ok(stripeMethod);

    const indiaRegion = await resolvePaymentRegion({ countryCode: 'IN', currencyCode: 'INR' });
    const eligibility = evaluatePaymentMethodEligibility(stripeMethod, indiaRegion);

    assert.equal(eligibility.isEligible, false);
    assert.equal(eligibility.ineligibilityCode, 'UNSUPPORTED_GATEWAY');
    assert.ok(eligibility.ineligibilityReason.includes('not available in India'));
  });

  it('7. Roaming Customer — Indian Razorpay Card is Ineligible in Canada (CAD)', async () => {
    const rzpMethod = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.userId, testUserA.id), eq(paymentMethods.gateway, 'razorpay')))
      .limit(1)
      .then(r => r[0]);

    assert.ok(rzpMethod);

    const canadaRegion = await resolvePaymentRegion({ countryCode: 'CA', currencyCode: 'CAD' });
    const eligibility = evaluatePaymentMethodEligibility(rzpMethod, canadaRegion);

    assert.equal(eligibility.isEligible, false);
    assert.equal(eligibility.ineligibilityCode, 'UNSUPPORTED_GATEWAY');
    assert.ok(eligibility.ineligibilityReason.includes('not available in Canada'));
  });

  it('8. Preferred Method Preservation When Roaming to Incompatible Region', async () => {
    // Stripe card is currently preferred for testUserA
    const stripeMethod = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.userId, testUserA.id), eq(paymentMethods.gateway, 'stripe')))
      .limit(1)
      .then(r => r[0]);

    await setPreferredPaymentMethod(stripeMethod.id, testUserA.id, 'rider');

    // Customer travels to India and requests payment options for an Indian ride
    const optionsInIndia = await resolveCustomerPaymentOptions(testUserA.id, {
      countryCode: 'IN',
      currencyCode: 'INR',
    });

    // 1. The preferred method in DB has NOT been changed or deleted!
    const recheckedStripeMethod = await getPaymentMethodById(stripeMethod.id, testUserA.id, 'rider');
    assert.equal(recheckedStripeMethod.isDefault, true, 'Customer preference must NOT be overwritten when roaming');

    // 2. But for this Indian transaction, it is NOT preselected (falls back to cash)
    assert.equal(optionsInIndia.preselectedMethodId, 'cash');

    // 3. Notice is provided explaining why the preferred card is unavailable
    assert.ok(optionsInIndia.preferredUnavailableNotice);
    assert.equal(optionsInIndia.preferredUnavailableNotice.unavailable, true);
    assert.equal(optionsInIndia.preferredUnavailableNotice.methodId, stripeMethod.id);
  });

  it('9. Returning to Original Region Restores Preselection of Preferred Method', async () => {
    const stripeMethod = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.userId, testUserA.id), eq(paymentMethods.gateway, 'stripe')))
      .limit(1)
      .then(r => r[0]);

    // Customer returns to Canada (CAD)
    const optionsInCanada = await resolveCustomerPaymentOptions(testUserA.id, {
      countryCode: 'CA',
      currencyCode: 'CAD',
    });

    // In Canada, the Stripe preferred card is eligible and preselected!
    assert.equal(optionsInCanada.preselectedMethodId, stripeMethod.id);
    assert.equal(optionsInCanada.preferredUnavailableNotice, null);
  });

  // ── 4. Security & Isolation ──────────────────────────────────────────────────
  it('10. Security — Customer Cannot Access or Delete Another Customer Payment Method', async () => {
    const userAMethod = await db.select().from(paymentMethods)
      .where(eq(paymentMethods.userId, testUserA.id))
      .limit(1)
      .then(r => r[0]);

    // User B attempts to view User A's card
    const foreignGet = await getPaymentMethodById(userAMethod.id, testUserB.id, 'rider');
    assert.equal(foreignGet, null);

    // User B attempts to set User A's card as preferred -> 404/Forbidden
    await assert.rejects(async () => {
      await setPreferredPaymentMethod(userAMethod.id, testUserB.id, 'rider');
    }, /not found or does not belong to you/);

    // User B attempts to delete User A's card -> 404/Forbidden
    await assert.rejects(async () => {
      await removePaymentMethod(userAMethod.id, testUserB.id, 'rider');
    }, /not found or does not belong to you/);
  });

  it('11. Security — Revoked / Removed Payment Methods Cannot Be Charged or Listed', async () => {
    // Add a temporary card for User B
    const tempCard = await savePaymentMethod({
      userId: testUserB.id,
      gateway: 'stripe',
      paymentMethodToken: `pm_revoked_${Date.now()}`,
      last4: '0000',
      cardBrand: 'Visa',
      expiryMonth: '11',
      expiryYear: '2028',
      merchantAccountId: getMerchantAccountId('stripe'),
    });

    // Remove it
    await removePaymentMethod(tempCard.id, testUserB.id, 'rider');

    // List methods: should not include revoked card
    const list = await listPaymentMethods(testUserB.id, 'rider');
    assert.ok(!list.some(m => m.id === tempCard.id));

    // Evaluating eligibility should return REVOKED
    const canadaRegion = await resolvePaymentRegion({ countryCode: 'CA', currencyCode: 'CAD' });
    const evalResult = evaluatePaymentMethodEligibility({ ...tempCard, isActive: false }, canadaRegion);
    assert.equal(evalResult.isEligible, false);
    assert.equal(evalResult.ineligibilityCode, 'REVOKED');
  });

  it('12. Expiry Date Check — Expired Card is Ineligible', async () => {
    const expiredCard = {
      gateway: 'stripe',
      paymentMethodToken: 'pm_expired',
      expiryMonth: '01',
      expiryYear: '2020', // in the past!
      isActive: true,
      merchantAccountId: getMerchantAccountId('stripe'),
    };

    const canadaRegion = await resolvePaymentRegion({ countryCode: 'CA', currencyCode: 'CAD' });
    const evalResult = evaluatePaymentMethodEligibility(expiredCard, canadaRegion);
    assert.equal(evalResult.isEligible, false);
    assert.equal(evalResult.ineligibilityCode, 'EXPIRED');
  });

  it('13. Merchant Account Mismatch — Card token from another merchant account is Ineligible', async () => {
    const mismatchedCard = {
      gateway: 'stripe',
      paymentMethodToken: 'pm_foreign_merchant_token',
      expiryMonth: '12',
      expiryYear: '2028',
      isActive: true,
      merchantAccountId: 'acct_foreign_submerchant_xyz', // Different merchant account!
    };

    const canadaRegion = await resolvePaymentRegion({ countryCode: 'CA', currencyCode: 'CAD' });
    const evalResult = evaluatePaymentMethodEligibility(mismatchedCard, canadaRegion);
    assert.equal(evalResult.isEligible, false);
    assert.equal(evalResult.ineligibilityCode, 'MERCHANT_ACCOUNT_MISMATCH');
  });

  // ── 5. Payment Initiation with Regional Saved Card ───────────────────────────
  it('14. Backend Revalidates Region and Blocks Payment with Ineligible Card', async () => {
    if (!rideInIndia) return;

    // testUserA attempts to initiate payment for an Indian ride (INR) using their Canadian Stripe card!
    const stripeMethod = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.userId, testUserA.id), eq(paymentMethods.gateway, 'stripe')))
      .limit(1)
      .then(r => r[0]);

    await assert.rejects(async () => {
      await initiateRidePayment(testUserA.id, rideInIndia.id, `idemp_${Date.now()}`, stripeMethod.id);
    }, (err) => {
      assert.equal(err.statusCode, 400);
      assert.equal(err.code, 'PAYMENT_METHOD_INELIGIBLE');
      return true;
    });
  });

  it('15. Backend Successfully Charges Eligible Saved Method', async () => {
    if (!rideInCanada) return;

    // testUserA initiates payment for a Canadian ride (CAD) using their Canadian Stripe card
    const stripeMethod = await db.select().from(paymentMethods)
      .where(and(eq(paymentMethods.userId, testUserA.id), eq(paymentMethods.gateway, 'stripe')))
      .limit(1)
      .then(r => r[0]);

    const result = await initiateRidePayment(testUserA.id, rideInCanada.id, `idemp_pay_${Date.now()}`, stripeMethod.id);
    assert.ok(result);
    assert.equal(result.currency, 'CAD');
    assert.ok(result.gatewayOrderId);

    // Verify ride payment status updated
    const [updatedRide] = await db.select().from(rides).where(eq(rides.id, rideInCanada.id));
    assert.ok(updatedRide.paymentStatus === 'paid' || updatedRide.paymentStatus === 'processing');
  });
});
