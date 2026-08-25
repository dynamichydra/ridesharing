import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideWebhookAction } from '../src/utils/webhook-dedup.js';

// decideWebhookAction() is the skip-vs-process decision receiveWebhookEvent() makes after
// looking up any existing webhook_events row for a (gateway, eventId, domain) triple.

test('no existing row -> process (first delivery of this event)', () => {
  assert.equal(decideWebhookAction(null), 'process');
});

test('an existing row of any status -> skip (a redelivery of an already-recorded event)', () => {
  for (const status of ['received', 'processing', 'processed', 'failed', 'dead_letter']) {
    assert.equal(decideWebhookAction({ status }), 'skip');
  }
});
