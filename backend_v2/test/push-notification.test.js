import test from 'node:test';
import assert from 'node:assert/strict';
import { isFirebaseConfigured, env } from '../src/config/env.js';
import { sendPush, sendPushMulticast } from '../src/modules/notification/notification.service.js';
import { NOTIFICATION_EVENTS, publishNotification } from '../src/modules/notification/notification-events.js';
import { renderTemplate } from '../src/utils/renderTemplate.js';

test('Mobile Push Notification — Environment & Firebase Configuration', () => {
  assert.equal(isFirebaseConfigured, true, 'Firebase must be marked as configured');
  assert.ok(env.FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID must be present');
  assert.ok(env.FIREBASE_CLIENT_EMAIL, 'FIREBASE_CLIENT_EMAIL must be present');
  assert.ok(env.FIREBASE_PRIVATE_KEY, 'FIREBASE_PRIVATE_KEY must be present');
});

test('Mobile Push Notification — sendPush & sendPushMulticast guard checks', async () => {
  // Should safely resolve without errors when token is missing/empty
  await assert.doesNotReject(async () => {
    await sendPush({ fcmToken: null, title: 'Test', body: 'Test body' });
    await sendPush({ fcmToken: '', title: 'Test', body: 'Test body' });
    await sendPushMulticast({ fcmTokens: [], title: 'Test', body: 'Test body' });
    await sendPushMulticast({ fcmTokens: null, title: 'Test', body: 'Test body' });
  });
});

test('Mobile Push Notification — Notification Events Registry & Channels', () => {
  const expectedEvents = [
    'PAYMENT_SUCCESS',
    'SUBSCRIPTION_ACTIVATED',
    'DOCUMENT_REJECTED',
    'WALLET_TOPUP',
    'REFUND_REQUEST_APPROVED',
    'REFUND_REQUEST_REJECTED',
    'WALLET_WITHDRAWAL_APPROVED',
    'WALLET_WITHDRAWAL_REJECTED',
    'RIDE_DISPUTE_RAISED',
    'RIDE_DISPUTE_RESPONDED',
    'RIDE_DISPUTE_RESOLVED',
  ];

  for (const ev of expectedEvents) {
    assert.ok(NOTIFICATION_EVENTS[ev], `Event ${ev} must be registered in NOTIFICATION_EVENTS`);
    assert.ok(Array.isArray(NOTIFICATION_EVENTS[ev].channels), `Event ${ev} must define channels`);
    assert.ok(NOTIFICATION_EVENTS[ev].channels.includes('push'), `Event ${ev} must include 'push' channel`);
    assert.ok(Array.isArray(NOTIFICATION_EVENTS[ev].variables), `Event ${ev} must define template variables`);
  }
});

test('Mobile Push Notification — Template Variable Rendering', () => {
  const template = 'Hello {{name}}, your ride #{{rideId}} payment of {{amount}} is successful!';
  const variables = { name: 'Rahul', rideId: '1029', amount: '₹350' };
  const rendered = renderTemplate(template, variables);

  assert.equal(rendered, 'Hello Rahul, your ride #1029 payment of ₹350 is successful!');
});
