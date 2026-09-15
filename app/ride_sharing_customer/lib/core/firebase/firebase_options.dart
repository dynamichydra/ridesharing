import 'package:firebase_core/firebase_core.dart' show FirebaseOptions;
import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// Default [FirebaseOptions] for use with your Firebase apps.
///
/// Configured for project `ryva-ride`.
class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    if (kIsWeb) {
      return web;
    }
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        return ios;
      case TargetPlatform.macOS:
        return macos;
      default:
        return android;
    }
  }

  static const FirebaseOptions web = FirebaseOptions(
    apiKey: 'AIzaSyDummyKeyForRyvaRideCustomerAppFCM',
    appId: '1:1046714936304:web:customer992817263541',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    authDomain: 'ryva-ride.firebaseapp.com',
    storageBucket: 'ryva-ride.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyDummyKeyForRyvaRideCustomerAppFCM',
    appId: '1:1046714936304:android:customer992817263541',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    storageBucket: 'ryva-ride.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyDummyKeyForRyvaRideCustomerAppFCM',
    appId: '1:1046714936304:ios:customer992817263541',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    storageBucket: 'ryva-ride.appspot.com',
    iosBundleId: 'com.example.ride_sharing_customer',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyDummyKeyForRyvaRideCustomerAppFCM',
    appId: '1:1046714936304:ios:customer992817263541',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    storageBucket: 'ryva-ride.appspot.com',
    iosBundleId: 'com.example.ride_sharing_customer',
  );
}
