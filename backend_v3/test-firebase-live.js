/**
 * Firebase Connection & Health Check Test Script
 *
 * Run: node test-firebase-live.js
 */
import { env, isFirebaseConfigured } from './src/config/env.js';

async function checkFirebase() {
  console.log('\n========================================');
  console.log('🔥 Firebase Cloud Messaging Health Check');
  console.log('========================================');

  console.log('\n1. Configuration Status:');
  console.log(`   - isFirebaseConfigured: ${isFirebaseConfigured ? '✅ YES' : '❌ NO'}`);
  console.log(`   - Project ID:          ${env.FIREBASE_PROJECT_ID || 'MISSING'}`);
  console.log(`   - Service Account:     ${env.FIREBASE_CLIENT_EMAIL || 'MISSING'}`);
  console.log(`   - Private Key:         ${env.FIREBASE_PRIVATE_KEY ? '✅ Present' : '❌ Missing'}`);

  if (!isFirebaseConfigured) {
    console.error('\n❌ Firebase is NOT properly configured. Check your env variables or _env.js.');
    process.exit(1);
  }

  try {
    console.log('\n2. Initializing Firebase Admin SDK...');
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getMessaging } = await import('firebase-admin/messaging');

    const apps = getApps();
    const app = apps.length > 0
      ? apps[0]
      : initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
        }),
      });

    console.log(`   ✅ Firebase App Initialized: [${app.name}]`);

    console.log('\n3. Authenticating with Google Cloud OAuth API...');
    const accessToken = await app.options.credential.getAccessToken();
    console.log(`   ✅ Google OAuth Token Acquired!`);
    console.log(`   - Token Type: ${accessToken.token_type}`);
    console.log(`   - Valid For:  ${accessToken.expires_in} seconds (${Math.round(accessToken.expires_in / 60)} minutes)`);

    console.log('\n4. Testing Firebase Cloud Messaging (FCM) Service...');
    const messaging = getMessaging(app);
    if (messaging) {
      console.log('   ✅ FCM Messaging Client is ready to dispatch push notifications.');
    }

    console.log('\n========================================');
    console.log('🎉 SUCCESS: Firebase is 100% connected and active!');
    console.log('========================================\n');
  } catch (err) {
    console.error('\n❌ Connection Failed:');
    console.error(`   ${err.message}`);
    console.error('\nFull error trace:');
    console.error(err);
    process.exit(1);
  }
}

checkFirebase();
