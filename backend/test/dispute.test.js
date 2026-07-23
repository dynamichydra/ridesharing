import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDisputeStatus } from '../src/modules/dispute/dispute.service.js';

// classifyDisputeStatus() decides whether a dispute status update resolves the ledger hold
// (won/lost) or leaves it open. Tested against Stripe's confirmed status enum
// (stripe/cjs/resources/Disputes.d.ts) plus Razorpay-shaped guesses, since Razorpay's exact
// vocabulary isn't verified from the installed SDK.

test('Stripe: won', () => {
  assert.equal(classifyDisputeStatus('won'), 'won');
});

test('Stripe: lost', () => {
  assert.equal(classifyDisputeStatus('lost'), 'lost');
});

for (const openStatus of ['needs_response', 'prevented', 'under_review', 'warning_closed', 'warning_needs_response', 'warning_under_review']) {
  test(`Stripe: '${openStatus}' is treated as still-open (not a resolution)`, () => {
    assert.equal(classifyDisputeStatus(openStatus), 'open');
  });
}

test('Razorpay-shaped guess: "won" classifies as won', () => {
  assert.equal(classifyDisputeStatus('won'), 'won');
});

test('Razorpay-shaped guess: "lost" classifies as lost', () => {
  assert.equal(classifyDisputeStatus('lost'), 'lost');
});

test('Razorpay-shaped guess: "open"/"under_review" classify as open, not a false win/loss', () => {
  assert.equal(classifyDisputeStatus('open'), 'open');
  assert.equal(classifyDisputeStatus('under_review'), 'open');
});

test('is case-insensitive', () => {
  assert.equal(classifyDisputeStatus('WON'), 'won');
  assert.equal(classifyDisputeStatus('Lost'), 'lost');
});

test('null/undefined/empty status is treated as open, not a crash', () => {
  assert.equal(classifyDisputeStatus(null), 'open');
  assert.equal(classifyDisputeStatus(undefined), 'open');
  assert.equal(classifyDisputeStatus(''), 'open');
});
