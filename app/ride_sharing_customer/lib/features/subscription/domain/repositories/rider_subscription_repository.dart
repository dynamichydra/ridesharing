import '../../domain/entities/rider_subscription_entities.dart';
import '../../data/datasources/rider_subscription_datasource.dart';

abstract class RiderSubscriptionRepository {
  Future<List<RiderSubscriptionPlan>> getPlans({String? countryId});
  Future<ActiveRiderSubscription?> getMySubscription();
  Future<List<SubscriptionHistoryItem>> getSubscriptionHistory({int page = 1, int limit = 20});
  Future<Map<String, dynamic>> initiateSubscription(String planId);
  Future<ActiveRiderSubscription> verifySubscription({
    required String planId,
    required String orderRef,
    required String paymentRef,
    String? signature,
  });
}

class RiderSubscriptionRepositoryImpl implements RiderSubscriptionRepository {
  final RiderSubscriptionDataSource _dataSource;

  RiderSubscriptionRepositoryImpl(this._dataSource);

  @override
  Future<List<RiderSubscriptionPlan>> getPlans({String? countryId}) {
    return _dataSource.getPlans(countryId: countryId);
  }

  @override
  Future<ActiveRiderSubscription?> getMySubscription() {
    return _dataSource.getMySubscription();
  }

  @override
  Future<List<SubscriptionHistoryItem>> getSubscriptionHistory({int page = 1, int limit = 20}) {
    return _dataSource.getSubscriptionHistory(page: page, limit: limit);
  }

  @override
  Future<Map<String, dynamic>> initiateSubscription(String planId) {
    return _dataSource.initiateSubscription(planId);
  }

  @override
  Future<ActiveRiderSubscription> verifySubscription({
    required String planId,
    required String orderRef,
    required String paymentRef,
    String? signature,
  }) {
    return _dataSource.verifySubscription(
      planId: planId,
      orderRef: orderRef,
      paymentRef: paymentRef,
      signature: signature,
    );
  }
}
