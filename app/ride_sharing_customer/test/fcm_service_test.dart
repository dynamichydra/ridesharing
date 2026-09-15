import 'package:flutter_test/flutter_test.dart';
import 'package:ride_sharing_customer/routes.dart';

void main() {
  group('Customer FCM Notification Routing Tests', () {
    String resolveCustomerRoute(Map<String, dynamic> data) {
      final type = data['type']?.toString().toLowerCase() ?? '';
      final rideId = data['rideId']?.toString() ?? '';

      if (type.contains('chat')) {
        return AppRoutes.rideChat;
      } else if (type.contains('ride') || rideId.isNotEmpty) {
        return AppRoutes.rideTracking;
      } else if (type.contains('subscription') || type.contains('plan')) {
        return AppRoutes.subscription;
      } else if (type.contains('wallet') || type.contains('payment')) {
        return AppRoutes.wallet;
      } else {
        return AppRoutes.notifications;
      }
    }

    test('Maps chat notification to AppRoutes.rideChat', () {
      final data = {'type': 'chat.message', 'rideId': 'ride_abc'};
      expect(resolveCustomerRoute(data), equals(AppRoutes.rideChat));
    });

    test('Maps ride status updates to AppRoutes.rideTracking', () {
      final data = {'type': 'ride.driver_assigned', 'rideId': 'ride_123'};
      expect(resolveCustomerRoute(data), equals(AppRoutes.rideTracking));
    });

    test('Maps subscription updates to AppRoutes.subscription', () {
      final data = {'type': 'subscription.renewed'};
      expect(resolveCustomerRoute(data), equals(AppRoutes.subscription));
    });

    test('Maps wallet / payment updates to AppRoutes.wallet', () {
      final data = {'type': 'wallet.credited', 'amount': '500'};
      expect(resolveCustomerRoute(data), equals(AppRoutes.wallet));
    });

    test('Maps general announcements to AppRoutes.notifications', () {
      final data = {'type': 'promo.discount', 'code': 'SAVE20'};
      expect(resolveCustomerRoute(data), equals(AppRoutes.notifications));
    });
  });
}
