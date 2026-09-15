import 'package:flutter_test/flutter_test.dart';

void main() {
  group('FCM Notification Route Mapping Tests', () {
    String resolveTargetRoute(Map<String, dynamic> data) {
      final type = data['type']?.toString().toLowerCase() ?? '';
      final rideId = data['rideId']?.toString() ?? '';

      if (type.contains('chat')) {
        return '/ride-chat';
      } else if (type.contains('ride') || rideId.isNotEmpty) {
        return '/active-ride';
      } else if (type.contains('subscription') || type.contains('plan')) {
        return '/subscription';
      } else if (type.contains('payout') || type.contains('wallet')) {
        return '/payout-history';
      } else if (type.contains('doc')) {
        return '/documents';
      }
      return '/dashboard';
    }

    test('Maps incoming chat notification to /ride-chat', () {
      final data = {'type': 'chat.message', 'rideId': 'ride_123', 'sender': 'rider'};
      expect(resolveTargetRoute(data), equals('/ride-chat'));
    });

    test('Maps ride offer / status notifications to /active-ride', () {
      final data = {'type': 'ride.assigned', 'rideId': 'ride_456'};
      expect(resolveTargetRoute(data), equals('/active-ride'));
    });

    test('Maps subscription activation or expiry to /subscription', () {
      final data = {'type': 'subscription.expired'};
      expect(resolveTargetRoute(data), equals('/subscription'));
    });

    test('Maps payout status update to /payout-history', () {
      final data = {'type': 'payout.processed', 'payoutId': 'pay_789'};
      expect(resolveTargetRoute(data), equals('/payout-history'));
    });

    test('Maps document expiration notification to /documents', () {
      final data = {'type': 'document.expired', 'docType': 'driving_license'};
      expect(resolveTargetRoute(data), equals('/documents'));
    });

    test('Defaults unclassified notifications to /dashboard', () {
      final data = {'type': 'system.announcement'};
      expect(resolveTargetRoute(data), equals('/dashboard'));
    });
  });
}
