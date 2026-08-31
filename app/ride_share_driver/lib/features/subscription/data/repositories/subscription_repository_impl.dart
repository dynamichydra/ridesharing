import '../../../../core/error/app_exception.dart';
import '../../domain/entities/subscription_plan.dart';
import '../../domain/entities/active_subscription.dart';
import '../../domain/entities/initiate_subscription_result.dart';
import '../../domain/repositories/subscription_repository.dart';
import '../datasources/subscription_remote_datasource.dart';

class SubscriptionRepositoryImpl implements SubscriptionRepository {
  final SubscriptionRemoteDataSource remoteDataSource;

  SubscriptionRepositoryImpl({required this.remoteDataSource});

  @override
  Future<List<SubscriptionPlan>> getPlans(String countryId) async {
    final list = await remoteDataSource.getPlans(countryId);
    return list.map(SubscriptionPlan.fromJson).toList();
  }

  @override
  Future<InitiateSubscriptionResult> initiateSubscription(String planId) async {
    final json = await remoteDataSource.initiateSubscription(planId);

    // Dev mode: no gateway configured for this currency — the backend
    // activated the subscription immediately and returned the `subscriptions`
    // row directly (it has `status`, not `gateway`).
    if (json.containsKey('status')) {
      return SubscriptionAlreadyActive(ActiveSubscription.fromJson(json));
    }

    final gateway = json['gateway'] as String?;
    final plan = json['plan'] as Map<String, dynamic>?;
    switch (gateway) {
      case 'razorpay':
        final amountMajor = (json['amount'] as num).toDouble();
        return RazorpayCheckoutRequired(
          gatewayOrderId: json['gatewayOrderId'] as String,
          keyId: json['keyId'] as String,
          amountMinor: (amountMajor * 100).round(),
          currencyCode: json['currency'] as String,
          paymentAttemptId: json['paymentAttemptId'] as String,
          planName: plan?['name'] as String? ?? 'Subscription',
        );
      case 'stripe':
        return StripeCheckoutRequired(
          gatewayOrderId: json['gatewayOrderId'] as String,
          clientSecret: json['clientSecret'] as String,
          publishableKey: json['publishableKey'] as String,
          paymentAttemptId: json['paymentAttemptId'] as String,
          planName: plan?['name'] as String? ?? 'Subscription',
        );
      default:
        throw UnknownException('Unsupported payment gateway: ${gateway ?? 'none'}');
    }
  }

  @override
  Future<ActiveSubscription> verifySubscription({
    required String planId,
    required String orderRef,
    required String paymentRef,
    String? signature,
  }) async {
    final json = await remoteDataSource.verifySubscription(
      planId: planId,
      orderRef: orderRef,
      paymentRef: paymentRef,
      signature: signature,
    );
    return ActiveSubscription.fromJson(json);
  }

  @override
  Future<ActiveSubscription?> getMySubscription() async {
    final json = await remoteDataSource.getMySubscription();
    if (json == null) return null;
    // GET /subscriptions/mine nests the row as { subscription: {...}, plan: {...} },
    // unlike the dev-mode initiate response which returns the subscriptions row flat.
    final subscriptionJson = json['subscription'] as Map<String, dynamic>?;
    if (subscriptionJson == null) return null;
    
    SubscriptionPlan? plan;
    if (json['plan'] != null) {
      try {
        plan = SubscriptionPlan.fromJson(json['plan'] as Map<String, dynamic>);
      } catch (_) {}
    }
    return ActiveSubscription.fromJson(subscriptionJson, plan: plan);
  }
}
