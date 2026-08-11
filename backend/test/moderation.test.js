import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanTextForProfanity } from '../src/modules/moderation/moderation.service.js';

test('detects profanity in text', () => {
  const res = scanTextForProfanity('The driver was an asshole and drove terribly');
  assert.equal(res.flagged, true);
  assert.ok(res.reasons.includes('profanity'));
  assert.ok(res.matches.includes('asshole'));
});

test('detects phone number leakage in text', () => {
  const res = scanTextForProfanity('Call me directly at 555-123-4567 for off-app trip');
  assert.equal(res.flagged, true);
  assert.ok(res.reasons.includes('pii_leak'));
});

test('detects email leakage in text', () => {
  const res = scanTextForProfanity('Contact rider@example.com for private payment');
  assert.equal(res.flagged, true);
  assert.ok(res.reasons.includes('pii_leak'));
});

test('passes clean polite review without flagging', () => {
  const res = scanTextForProfanity('Great driver! Very polite, smooth driving, and clean car.');
  assert.equal(res.flagged, false);
  assert.equal(res.reasons.length, 0);
  assert.equal(res.matches.length, 0);
});
