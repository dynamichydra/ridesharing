import 'package:flutter_test/flutter_test.dart';
import 'package:ride_share_driver/features/earnings/data/models/commission_status_model.dart';

void main() {
  group('CommissionStatusModel Tests', () {
    test('Correctly parses standard non-subscriber JSON', () {
      final json = {
        'driverId': 'drv_123',
        'subscriptionStatus': 'inactive',
        'isSubscriber': false,
        'activePlan': null,
        'effectiveCommissionRate': 0.20,
        'effectiveCommissionPercentage': '20%',
        'standardCommissionRate': 0.20,
        'standardCommissionPercentage': '20%',
        'commissionSavingsPercentage': '0%',
        'bookingFeeMinor': 500,
        'bookingFeeWaived': false,
        'priorityMatchingBonus': 0,
        'resolutionTier': 'default',
        'ruleName': 'Default Platform Commission',
      };

      final model = CommissionStatusModel.fromJson(json);

      expect(model.driverId, equals('drv_123'));
      expect(model.subscriptionStatus, equals('inactive'));
      expect(model.isSubscriber, isFalse);
      expect(model.activePlan, isNull);
      expect(model.effectiveCommissionRate, equals(0.20));
      expect(model.effectiveCommissionPercentage, equals('20%'));
      expect(model.standardCommissionPercentage, equals('20%'));
      expect(model.commissionSavingsPercentage, equals('0%'));
      expect(model.bookingFeeMinor, equals(500));
      expect(model.bookingFee, equals(5.0));
      expect(model.bookingFeeWaived, isFalse);
      expect(model.priorityMatchingBonus, equals(0));
      expect(model.ruleName, equals('Default Platform Commission'));
      expect(model.resolutionTier, equals('default'));
      expect(model.hasSavings, isFalse);
    });

    test('Correctly parses subscriber JSON with active plan and savings', () {
      final json = {
        'driverId': 'drv_456',
        'subscriptionStatus': 'active',
        'isSubscriber': true,
        'activePlan': {
          'id': 'plan_gold',
          'name': 'Pro Driver Monthly',
          'type': 'monthly',
          'expiresAt': '2026-10-15T00:00:00.000Z',
        },
        'effectiveCommissionRate': 0.05,
        'effectiveCommissionPercentage': '5%',
        'standardCommissionRate': 0.20,
        'standardCommissionPercentage': '20%',
        'commissionSavingsPercentage': '15%',
        'bookingFeeMinor': 0,
        'bookingFeeWaived': true,
        'priorityMatchingBonus': 10,
        'resolutionTier': 'city',
        'ruleName': 'Delhi NCR Tier 1 Commission',
      };

      final model = CommissionStatusModel.fromJson(json);

      expect(model.driverId, equals('drv_456'));
      expect(model.isSubscriber, isTrue);
      expect(model.subscriptionStatus, equals('active'));
      expect(model.activePlan, isNotNull);
      expect(model.activePlan!.id, equals('plan_gold'));
      expect(model.activePlan!.name, equals('Pro Driver Monthly'));
      expect(model.activePlan!.type, equals('monthly'));
      expect(model.effectiveCommissionPercentage, equals('5%'));
      expect(model.standardCommissionPercentage, equals('20%'));
      expect(model.commissionSavingsPercentage, equals('15%'));
      expect(model.bookingFeeWaived, isTrue);
      expect(model.bookingFee, equals(0.0));
      expect(model.priorityMatchingBonus, equals(10));
      expect(model.hasSavings, isTrue);
    });

    test('Fallback constructor provides safe non-null defaults', () {
      final fallback = CommissionStatusModel.fallback();

      expect(fallback.driverId, isEmpty);
      expect(fallback.isSubscriber, isFalse);
      expect(fallback.effectiveCommissionPercentage, equals('20%'));
      expect(fallback.standardCommissionPercentage, equals('20%'));
      expect(fallback.hasSavings, isFalse);
      expect(fallback.bookingFeeWaived, isFalse);
    });

    test('Plan resolution properly formats active plan and standard plan labels', () {
      final standard = CommissionStatusModel.fallback();
      final subscriber = CommissionStatusModel(
        driverId: 'drv_sub',
        subscriptionStatus: 'active',
        isSubscriber: true,
        activePlan: const ActivePlanSummary(
          id: 'p_1',
          name: 'Pro Driver Monthly',
          type: 'monthly',
        ),
        effectiveCommissionRate: 0.05,
        effectiveCommissionPercentage: '5%',
        standardCommissionRate: 0.20,
        standardCommissionPercentage: '20%',
        commissionSavingsPercentage: '15%',
        bookingFeeMinor: 0,
        bookingFeeWaived: true,
        priorityMatchingBonus: 5,
        resolutionTier: 'city',
        ruleName: 'Pro Tier',
      );

      final standardPlanName = standard.activePlan?.name ?? (standard.isSubscriber ? 'Subscriber Plan' : 'Standard Plan');
      final subscriberPlanName = subscriber.activePlan?.name ?? (subscriber.isSubscriber ? 'Subscriber Plan' : 'Standard Plan');

      expect(standardPlanName, equals('Standard Plan'));
      expect(subscriberPlanName, equals('Pro Driver Monthly'));
    });
  });
}
