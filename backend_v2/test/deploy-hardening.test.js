import test from 'node:test';
import assert from 'node:assert/strict';
import { hashCode, codesMatch, generateOtp } from '../src/utils/otp.js';
import { toPublicDriver } from '../src/utils/public-dto.js';
import { isValidTransition } from '../src/modules/ride/ride-state-machine.js';
import { isValidLocalUploadSignature } from '../src/utils/storage.js';
import { razorpayGateway } from '../src/modules/payment/gateways/razorpay.gateway.js';
import { env, isTwilioConfigured, otpDevCode } from '../src/config/env.js';

test('OTP codes are stored hashed and compared safely', () => {
  const stored = hashCode('482913');
  assert.notEqual(stored, '482913');
  assert.equal(codesMatch(stored, '482913'), true);
  assert.equal(codesMatch(stored, '482914'), false);
  assert.equal(codesMatch(null, '482913'), false);
  assert.equal(codesMatch(stored, undefined), false);
});

test('generated OTPs are random 6-digit codes unless a dev code is configured', () => {
  if (otpDevCode && !isTwilioConfigured) return; // explicit local-testing mode
  const codes = new Set(Array.from({ length: 20 }, () => generateOtp()));
  for (const c of codes) assert.match(c, /^\d{6}$/);
  assert.ok(codes.size > 1, 'codes must not be constant');
});

test('public driver DTO never exposes identity documents or internal fields', () => {
  const dto = toPublicDriver({
    id: 'd1', name: 'Asha', phone: '+919800000000', rating: '4.90', vehicleNumber: 'KA01AB1234',
    aadharNumber: '123412341234', aadharDoc: 'key', licenseNumber: 'DL-1', licenseDoc: 'key',
    email: 'a@x.com', fcmToken: 'tok', dateOfBirth: '1990-01-01', approvalNote: 'internal',
  });
  for (const k of ['aadharNumber', 'aadharDoc', 'licenseNumber', 'licenseDoc', 'email', 'fcmToken', 'dateOfBirth', 'approvalNote']) {
    assert.equal(k in dto, false, `${k} must not be in the public DTO`);
  }
  assert.equal(dto.name, 'Asha');
  assert.equal(dto.vehicleNumber, 'KA01AB1234');
  assert.equal(toPublicDriver(null), null);
});

test('ride state machine allows re-dispatch after a driver cancels, not after start', () => {
  assert.equal(isValidTransition('accepted', 'searching'), true);
  assert.equal(isValidTransition('arrived', 'searching'), true);
  assert.equal(isValidTransition('started', 'searching'), false);
  assert.equal(isValidTransition('scheduled', 'searching'), true);
});

test('local upload signatures reject missing, tampered and expired signatures', () => {
  const future = Math.floor(Date.now() / 1000) + 60;
  assert.equal(isValidLocalUploadSignature('a/b.png', future, undefined), false);
  assert.equal(isValidLocalUploadSignature('a/b.png', future, 'deadbeef'), false);
  assert.equal(isValidLocalUploadSignature('a/b.png', Math.floor(Date.now() / 1000) - 1, '00'), false);
});

test('Razorpay webhooks are rejected when no signing secret is configured', () => {
  if (env.RAZORPAY_WEBHOOK_SECRET) return; // configured environments verify for real
  assert.equal(razorpayGateway.verifyWebhookSignature('{"event":"payment.captured"}', 'anything'), false);
});

test('Razorpay payment signatures use a constant-length comparison', () => {
  assert.equal(razorpayGateway.verifyPayment({ orderRef: 'order_1', paymentRef: 'pay_1', signature: 'short' }), false);
  assert.equal(razorpayGateway.verifyPayment({ orderRef: 'order_1', paymentRef: 'pay_1', signature: undefined }), false);
});
