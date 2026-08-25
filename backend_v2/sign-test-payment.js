/**
 * sign-test-payment.js — generate a fake but valid Razorpay paymentRef+signature pair
 * for locally testing POST /subscriptions/verify without going through Checkout.
 *
 * Usage:
 *   node sign-test-payment.js <orderRef> [paymentRef]
 *
 * If paymentRef is omitted, a plausible-looking pay_xxx id is generated.
 * Mirrors the HMAC in src/modules/payment/gateways/razorpay.gateway.js verifyPayment().
 */
import 'dotenv/config';
import { createHmac, randomBytes } from 'node:crypto';

const [orderRef, paymentRefArg] = process.argv.slice(2);
if (!orderRef) {
  console.error('Usage: node sign-test-payment.js <orderRef> [paymentRef]');
  process.exit(1);
}
if (!process.env.RAZORPAY_KEY_SECRET) {
  console.error('RAZORPAY_KEY_SECRET is not set in .env');
  process.exit(1);
}

const paymentRef = paymentRefArg || `pay_${randomBytes(7).toString('hex')}`;
const signature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
  .update(`${orderRef}|${paymentRef}`)
  .digest('hex');

console.log(JSON.stringify({ orderRef, paymentRef, signature }, null, 2));
