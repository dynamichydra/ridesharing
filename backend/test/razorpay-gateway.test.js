import 'dotenv/config';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRazorpayApiError } from '../src/modules/payment/gateways/razorpay.gateway.js';

// The installed `razorpay` package's raw API client (razorpay/dist/api.js normalizeError)
// throws a plain object `{ statusCode, error: { code, description, ... } }` on any failed
// request — not an Error, and with no `.message` property. The app's global error handler
// reads `error.message`, so left unwrapped this would surface as a message-less error on every
// Razorpay API failure. normalizeRazorpayApiError() is the fix — this locks in its shape.

test('unwraps a Razorpay SDK error into {statusCode, message}', () => {
  const sdkError = { statusCode: 400, error: { code: 'BAD_REQUEST_ERROR', description: 'The api key/secret provided is invalid' } };
  const result = normalizeRazorpayApiError(sdkError);
  assert.equal(result.statusCode, 400);
  assert.equal(result.message, 'The api key/secret provided is invalid');
});

test('falls back to a generic message if the SDK error has no description', () => {
  const sdkError = { statusCode: 500, error: {} };
  const result = normalizeRazorpayApiError(sdkError);
  assert.equal(result.statusCode, 500);
  assert.equal(result.message, 'Razorpay API error');
});

test('defaults to 502 if the SDK error has no statusCode', () => {
  const sdkError = { error: { description: 'Something went wrong' } };
  const result = normalizeRazorpayApiError(sdkError);
  assert.equal(result.statusCode, 502);
});

test('passes through an error that does not match the SDK error shape unchanged', () => {
  const plainError = new Error('a normal JS error, e.g. a network failure');
  assert.equal(normalizeRazorpayApiError(plainError), plainError);
});

test('passes through null/undefined unchanged, without crashing', () => {
  assert.equal(normalizeRazorpayApiError(null), null);
  assert.equal(normalizeRazorpayApiError(undefined), undefined);
});
