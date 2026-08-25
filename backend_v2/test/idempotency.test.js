import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideIdempotencyOutcome } from '../src/utils/idempotency.js';

// decideIdempotencyOutcome() is the branching logic withIdempotency() uses once it has
// looked up the existing idempotency_keys row (or found none) for a (scope, key) pair.

test('no existing row -> run (first time seeing this key)', () => {
  assert.deepEqual(decideIdempotencyOutcome(null), { action: 'run' });
});

test('completed row -> replay the stored response, never re-run fn', () => {
  const response = { paymentAttemptId: 'abc123' };
  const outcome = decideIdempotencyOutcome({ status: 'completed', responseSnapshot: response });
  assert.equal(outcome.action, 'replay');
  assert.deepEqual(outcome.response, response);
});

test('pending row -> reject, a request with this key is already in flight', () => {
  assert.deepEqual(decideIdempotencyOutcome({ status: 'pending' }), { action: 'reject' });
});

test('failed row -> retry, the previous attempt errored so a new one may run', () => {
  assert.deepEqual(decideIdempotencyOutcome({ status: 'failed' }), { action: 'retry' });
});
