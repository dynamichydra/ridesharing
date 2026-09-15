import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import '../firebase/firebase_options.dart';
import '../network/api_client.dart';
import '../storage/secure_storage.dart';

/// Top-level background message handler required by `firebase_messaging`.
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  try {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
  } catch (e) {
    debugPrint('[FCM Background] Firebase init error: $e');
  }
  debugPrint('[FCM Background] Handling message: ${message.messageId} | Data: ${message.data}');
}

/// Core service managing Firebase Cloud Messaging (FCM), push notifications,
/// token synchronization with backend, and foreground/background display.
class FcmService {
  final ApiClient apiClient;
  final SecureStorage secureStorage;

  static const String _channelId = 'high_importance_channel';
  static const String _channelName = 'Ryva Driver Notifications';
  static const String _channelDescription =
      'High priority alerts for incoming ride offers, status changes, and platform announcements.';

  final FlutterLocalNotificationsPlugin _localNotificationsPlugin =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;
  String? _lastToken;

  /// Cached FCM token from last successful fetch.
  String? get lastToken => _lastToken;

  /// Callback when a user taps a notification (provides route and payload).
  void Function(String route, Map<String, dynamic> data)? onNotificationClicked;

  FcmService({
    required this.apiClient,
    required this.secureStorage,
  });

  /// Initialize Firebase, local notifications plugin, and message listeners.
  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      // 1. Initialize Firebase Core
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      }

      // 2. Set Background Handler
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      // 3. Initialize Local Notifications Plugin for Android/iOS
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const darwinInit = DarwinInitializationSettings(
        requestAlertPermission: false,
        requestBadgePermission: false,
        requestSoundPermission: false,
      );
      const initSettings = InitializationSettings(
        android: androidInit,
        iOS: darwinInit,
      );

      await _localNotificationsPlugin.initialize(
        settings: initSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          _handleLocalNotificationClick(response.payload);
        },
      );

      // 4. Create Android High-Importance Channel
      const androidNotificationChannel = AndroidNotificationChannel(
        _channelId,
        _channelName,
        description: _channelDescription,
        importance: Importance.max,
        playSound: true,
        enableVibration: true,
      );

      await _localNotificationsPlugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(androidNotificationChannel);

      // 5. Configure Foreground Presentation Options
      await FirebaseMessaging.instance.setForegroundNotificationPresentationOptions(
        alert: true,
        badge: true,
        sound: true,
      );

      // 6. Request Notification Permissions
      await requestPermission();

      // 7. Setup Message Listeners
      _setupMessageListeners();

      // 8. Fetch and Sync Initial Token
      await syncTokenWithBackend();

      _isInitialized = true;
      debugPrint('[FCM Service] Initialized successfully');
    } catch (e) {
      debugPrint('[FCM Service] Initialization warning (running in safe fallback mode): $e');
    }
  }

  /// Request push notification permissions from user
  Future<bool> requestPermission() async {
    try {
      final settings = await FirebaseMessaging.instance.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: true,
        provisional: false,
        sound: true,
      );

      final isAuthorized = settings.authorizationStatus == AuthorizationStatus.authorized ||
          settings.authorizationStatus == AuthorizationStatus.provisional;

      debugPrint('[FCM Service] Permission status: ${settings.authorizationStatus}');
      return isAuthorized;
    } catch (e) {
      debugPrint('[FCM Service] Error requesting permission: $e');
      return false;
    }
  }

  /// Get current FCM Token
  Future<String?> getToken() async {
    try {
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        _lastToken = token;
        debugPrint('[FCM Service] FCM Token: ${token.substring(0, token.length > 12 ? 12 : token.length)}...');
      }
      return token;
    } catch (e) {
      debugPrint('[FCM Service] Error fetching FCM token: $e');
      return null;
    }
  }

  /// Synchronize FCM token with backend: PATCH /api/v1/drivers/fcm-token
  Future<bool> syncTokenWithBackend([String? tokenOverride]) async {
    try {
      final token = tokenOverride ?? await getToken();
      if (token == null || token.isEmpty) return false;

      // Only attempt network patch if driver is currently authenticated
      final accessToken = await secureStorage.getToken();
      if (accessToken == null || accessToken.isEmpty) {
        debugPrint('[FCM Service] Driver not authenticated yet; stored token for post-auth sync.');
        return false;
      }

      final response = await apiClient.dio.patch(
        '/drivers/fcm-token',
        data: {'fcmToken': token},
      );

      if (response.statusCode == 200 || response.data?['SUCCESS'] == true) {
        debugPrint('[FCM Service] Successfully registered driver FCM token with backend');
        return true;
      }
      return false;
    } on DioException catch (e) {
      debugPrint('[FCM Service] Failed to sync FCM token with backend: ${e.message}');
      return false;
    } catch (e) {
      debugPrint('[FCM Service] Unexpected error syncing FCM token: $e');
      return false;
    }
  }

  /// Delete FCM Token on logout
  Future<void> deleteToken() async {
    try {
      await FirebaseMessaging.instance.deleteToken();
      _lastToken = null;
      debugPrint('[FCM Service] Deleted FCM token on logout');
    } catch (e) {
      debugPrint('[FCM Service] Error deleting FCM token: $e');
    }
  }

  /// Set up foreground, background, and initial message listeners
  void _setupMessageListeners() {
    // 1. Foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('[FCM Foreground] Received: ${message.notification?.title} | ${message.notification?.body}');
      _showLocalNotification(message);
    });

    // 2. Notification opened when app was in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM Opened] App opened from notification: ${message.data}');
      _handleNotificationPayload(message.data);
    });

    // 3. Notification opened when app was terminated
    FirebaseMessaging.instance.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        debugPrint('[FCM Initial] App opened from terminated notification: ${message.data}');
        _handleNotificationPayload(message.data);
      }
    });

    // 4. Token refresh listener
    FirebaseMessaging.instance.onTokenRefresh.listen((String newToken) {
      debugPrint('[FCM Service] Token refreshed: ${newToken.substring(0, 10)}...');
      _lastToken = newToken;
      syncTokenWithBackend(newToken);
    });
  }

  /// Display a heads-up notification using FlutterLocalNotificationsPlugin
  Future<void> _showLocalNotification(RemoteMessage message) async {
    final notification = message.notification;
    final title = notification?.title ?? message.data['title'] ?? 'Ryva Driver';
    final body = notification?.body ?? message.data['body'] ?? 'New notification received';

    const androidDetails = AndroidNotificationDetails(
      _channelId,
      _channelName,
      channelDescription: _channelDescription,
      importance: Importance.max,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
    );

    const darwinDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const notificationDetails = NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
    );

    final id = message.messageId?.hashCode ?? DateTime.now().millisecondsSinceEpoch.remainder(100000);

    await _localNotificationsPlugin.show(
      id: id,
      title: title,
      body: body,
      notificationDetails: notificationDetails,
      payload: jsonEncode(message.data),
    );
  }

  /// Handle local notification tap
  void _handleLocalNotificationClick(String? payload) {
    if (payload == null || payload.isEmpty) return;
    try {
      final data = jsonDecode(payload) as Map<String, dynamic>;
      _handleNotificationPayload(data);
    } catch (e) {
      debugPrint('[FCM Service] Error parsing local notification payload: $e');
    }
  }

  /// Route user based on notification event type and rideId
  void _handleNotificationPayload(Map<String, dynamic> data) {
    final type = data['type']?.toString().toLowerCase() ?? '';
    final rideId = data['rideId']?.toString() ?? '';

    String targetRoute = '/dashboard';

    if (type.contains('chat')) {
      targetRoute = '/ride-chat';
    } else if (type.contains('ride') || rideId.isNotEmpty) {
      targetRoute = '/active-ride';
    } else if (type.contains('subscription') || type.contains('plan')) {
      targetRoute = '/subscription';
    } else if (type.contains('payout') || type.contains('wallet')) {
      targetRoute = '/payout-history';
    } else if (type.contains('doc')) {
      targetRoute = '/documents';
    }

    if (onNotificationClicked != null) {
      onNotificationClicked!(targetRoute, data);
    }
  }
}
