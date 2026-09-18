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
    apiKey: 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p67',
    appId: '1:1046714936304:web:driver992817263541',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    authDomain: 'ryva-ride.firebaseapp.com',
    storageBucket: 'ryva-ride.appspot.com',
  );

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p67',
    appId: '1:1046714936304:android:driver992817263541',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    storageBucket: 'ryva-ride.appspot.com',
  );

  static const FirebaseOptions ios = FirebaseOptions(
    apiKey: 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p67',
    appId: '1:1046714936304:ios:d41d8cd98f00b204e98009',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    storageBucket: 'ryva-ride.appspot.com',
    iosBundleId: 'com.example.rideShareDriver',
  );

  static const FirebaseOptions macos = FirebaseOptions(
    apiKey: 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p67',
    appId: '1:1046714936304:ios:d41d8cd98f00b204e98009',
    messagingSenderId: '1046714936304',
    projectId: 'ryva-ride',
    storageBucket: 'ryva-ride.appspot.com',
    iosBundleId: 'com.example.rideShareDriver',
  );
}
