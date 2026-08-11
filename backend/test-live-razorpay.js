import 'dotenv/config';
import { razorpayGateway } from './src/modules/payment/gateways/razorpay.gateway.js';
import { computeCommission } from './src/modules/commission/commission.service.js';
import { createHmac } from 'crypto';

async function runLiveRazorpayTest() {
  console.log('--- STARTING LIVE RAZORPAY TEST MODE VERIFICATION ---');

  if (!razorpayGateway.isConfigured) {
    console.error('❌ Razorpay is not configured in .env!');
    process.exit(1);
  }

  // 1. Create a real Order on Razorpay Test API ($25.00 / ₹250.00 = 2500 minor units)
  console.log('\nStep 1: Creating real order on Razorpay API (Test Mode)...');
  const amountMinor = 2500;
  const currencyCode = 'INR';

  const orderResult = await razorpayGateway.createOrder({
    amountMinor,
    currencyCode,
    metadata: { testRideId: 'test-ride-999' },
    idempotencyKey: `test-${Date.now()}`,
  });

  console.log('✅ Real Razorpay Order Created Successfully!');
  console.log(`   Order ID: ${orderResult.gatewayOrderId}`);
  console.log(`   Amount: ₹${orderResult.amount}`);
  console.log(`   Key ID: ${orderResult.keyId}`);

  // 2. Generate valid test payment ref & HMAC signature
  console.log('\nStep 2: Simulating Razorpay Checkout Callback & HMAC Signature Generation...');
  const fakePaymentRef = `pay_test_${Math.random().toString(36).substring(2, 10)}`;
  const signature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderResult.gatewayOrderId}|${fakePaymentRef}`)
    .digest('hex');

  const isValidSignature = razorpayGateway.verifyPayment({
    orderRef: orderResult.gatewayOrderId,
    paymentRef: fakePaymentRef,
    signature,
  });

  assert(isValidSignature, 'HMAC Signature verification failed');
  console.log('✅ HMAC Signature Verification Passed!');
  console.log(`   Payment Ref: ${fakePaymentRef}`);
  console.log(`   Signature: ${signature}`);

  // 3. Test Driver Earnings & System Commission Split Logic
  console.log('\nStep 3: Calculating System Commission vs Driver Earnings Split...');
  const commissionRule = {
    bookingFeeMinor: 200,      // ₹2.00 booking fee
    nonSubscriberRate: '0.20', // 20% platform cut
    subscriberRate: '0.05',    // 5% platform cut for subscribers
  };

  const splitNormal = computeCommission({
    finalFareMinor: amountMinor,
    rule: commissionRule,
    isSubscriber: false,
  });

  console.log('\n--- SPLIT BREAKDOWN FOR NORMAL DRIVER ---');
  console.log(`   Total Paid by Rider:   ₹${(amountMinor / 100).toFixed(2)}`);
  console.log(`   Booking Fee (Fixed):   ₹${(splitNormal.bookingFeeMinor / 100).toFixed(2)}`);
  console.log(`   Platform Cut (20%):    ₹${((splitNormal.commissionMinor - splitNormal.bookingFeeMinor) / 100).toFixed(2)}`);
  console.log(`   ---------------------------------------`);
  console.log(`   👑 SYSTEM COMMISSION:  ₹${(splitNormal.commissionMinor / 100).toFixed(2)}  (Credited to Platform Revenue Account)`);
  console.log(`   🚗 DRIVER EARNINGS:    ₹${(splitNormal.driverEarningsMinor / 100).toFixed(2)}  (Credited to Driver Wallet)`);

  const splitSubbed = computeCommission({
    finalFareMinor: amountMinor,
    rule: commissionRule,
    isSubscriber: true,
  });

  console.log('\n--- SPLIT BREAKDOWN FOR SUBSCRIBED DRIVER (5% DISCOUNTED RATE) ---');
  console.log(`   Total Paid by Rider:   ₹${(amountMinor / 100).toFixed(2)}`);
  console.log(`   👑 SYSTEM COMMISSION:  ₹${(splitSubbed.commissionMinor / 100).toFixed(2)}`);
  console.log(`   🚗 DRIVER EARNINGS:    ₹${(splitSubbed.driverEarningsMinor / 100).toFixed(2)}`);

  console.log('\n✅ ALL LIVE RAZORPAY TESTS COMPLETED SUCCESSFULLY!');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

runLiveRazorpayTest().catch((err) => {
  console.error('❌ Live Razorpay test failed:', err);
  process.exit(1);
});
