import '../entities/subscription_plan.dart';
import '../entities/active_subscription.dart';
import '../entities/initiate_subscription_result.dart';

abstract class SubscriptionRepository {
  Future<List<SubscriptionPlan>> getPlans(String countryId);

  Future<InitiateSubscriptionResult> initiateSubscription(String planId);

  Future<ActiveSubscription> verifySubscription({
    required String planId,
    required String orderRef,
    required String paymentRef,
    String? signature,
  });

  Future<ActiveSubscription?> getMySubscription();
}
