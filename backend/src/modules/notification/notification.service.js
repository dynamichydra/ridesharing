import { env } from '../../config/env.js';

let _messaging = null;

async function getMessaging() {
  if (_messaging) return _messaging;
  if (!env.FIREBASE_PROJECT_ID) {
    console.warn('[FCM] Firebase not configured — push notifications disabled');
    return null;
  }
  const { default: admin } = await import('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  _messaging = admin.messaging();
  return _messaging;
}

/**
 * Send a push notification to a single FCM token.
 */
export async function sendPush({ fcmToken, title, body, data = {} }) {
  if (!fcmToken) return;
  const messaging = await getMessaging();
  if (!messaging) {
    console.log(`[FCM DEV] → ${title}: ${body}`);
    return;
  }
  try {
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });
  } catch (err) {
    console.error(`[FCM] Failed to send to ${fcmToken.slice(-8)}:`, err.message);
  }
}

/**
 * Send to multiple tokens (multicast).
 */
export async function sendPushMulticast({ fcmTokens, title, body, data = {} }) {
  if (!fcmTokens?.length) return;
  const messaging = await getMessaging();
  if (!messaging) {
    console.log(`[FCM DEV] Multicast (${fcmTokens.length}) → ${title}: ${body}`);
    return;
  }
  try {
    await messaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high' },
    });
  } catch (err) {
    console.error('[FCM] Multicast error:', err.message);
  }
}
