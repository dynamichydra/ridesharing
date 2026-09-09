import 'package:flutter_test/flutter_test.dart';
import 'package:ride_share_driver/features/subscription/domain/entities/subscription_plan.dart';
import 'package:ride_share_driver/features/subscription/domain/entities/active_subscription.dart';

void main() {
  group('SubscriptionPlan Entity & Parsing', () {
    test('Correctly parses basic plan JSON', () {
      final json = {
        'id': 'plan-1',
        'name': 'Weekly Plan',
        'type': 'weekly',
        'currencyCode': 'INR',
        'priceMinor': 29900,
        'durationDays': 7,
        'trialDays': 0,
        'features': ['Unlimited rides', '0% commission'],
        'maxRidesPerDay': 20,
        'priorityMatching': false,
      };

      final plan = SubscriptionPlan.fromJson(json);
      expect(plan.id, equals('plan-1'));
      expect(plan.name, equals('Weekly Plan'));
      expect(plan.priceMajor, equals(299.0));
      expect(plan.hasDiscount, isFalse);
      expect(plan.priorityMatching, isFalse);
    });

    test('Correctly parses plan with group discount and special offer', () {
      final json = {
        'id': 'plan-2',
        'name': 'Monthly Pro',
        'type': 'monthly',
        'currencyCode': 'INR',
        'priceMinor': 79900,
        'originalPriceMinor': 99900,
        'durationDays': 30,
        'trialDays': 0,
        'features': ['Unlimited rides', 'VIP dispatch'],
        'maxRidesPerDay': null,
        'priorityMatching': true,
        'specialOffer': {
          'groupId': 'group-gold',
          'groupName': 'Gold Tier Drivers',
          'discountPercent': 20,
          'discountAmountMinor': 20000,
        },
        'entitlements': {
          'commissionRate': 0.0,
          'priorityScoreBonus': 15,
        },
      };

      final plan = SubscriptionPlan.fromJson(json);
      expect(plan.hasDiscount, isTrue);
      expect(plan.originalPriceMajor, equals(999.0));
      expect(plan.priceMajor, equals(799.0));
      expect(plan.specialOfferGroupName, equals('Gold Tier Drivers'));
      expect(plan.discountPercent, equals(20));
      expect(plan.discountAmountMinor, equals(20000));
      expect(plan.priorityMatching, isTrue);
      expect(plan.entitlements, isNotNull);
      expect(plan.entitlements!['priorityScoreBonus'], equals(15));
    });

    test('Correctly parses plan with vehicleTypeIds as List<dynamic>', () {
      final json = {
        'id': 'plan-3',
        'name': 'Yearly Plan',
        'type': 'yearly',
        'currencyCode': 'INR',
        'priceMinor': 799900,
        'durationDays': 365,
        'trialDays': 7,
        'features': ['Unlimited rides'],
        'vehicleTypeIds': <dynamic>[
          '632f902e-92b7-4354-9f6a-589e7b367b00',
          'ac8099f5-4e2b-4126-af35-c1bdc52f85a8',
        ],
        'priorityMatching': true,
      };

      final plan = SubscriptionPlan.fromJson(json);
      expect(plan.vehicleTypeIds, isA<List<String>>());
      expect(plan.vehicleTypeIds!.length, equals(2));
      expect(plan.vehicleTypeIds![0], equals('632f902e-92b7-4354-9f6a-589e7b367b00'));
    });

    test('ActiveSubscription with daysRemaining and isActive', () {
      final activeJson = {
        'id': 'sub-1',
        'planId': 'plan-2',
        'status': 'active',
        'endDate': DateTime.now().add(const Duration(days: 10)).toIso8601String(),
        'currencyCode': 'INR',
        'amountMinor': 79900,
      };

      final activeSub = ActiveSubscription.fromJson(activeJson);
      expect(activeSub.isActive, isTrue);
      expect(activeSub.isExpired, isFalse);
      expect(activeSub.daysRemaining, inInclusiveRange(9, 10));
    });
  });
}
