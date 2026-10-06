const fs = require('fs');
const path = require('path');

function replace(file, search, replacement) {
  const p = path.resolve(file);
  const content = fs.readFileSync(p, 'utf8');
  fs.writeFileSync(p, content.replace(search, replacement));
}

// 1. SubscriptionRemoteDataSource
replace('lib/features/subscription/data/datasources/subscription_remote_datasource.dart',
`  Future<Map<String, dynamic>> initiateSubscription(String planId) async {
    try {
      final idempotencyKey = const Uuid().v4();
      final response = await apiClient.dio.post(
        '/subscriptions/initiate',
        data: {'planId': planId},`,
`  Future<Map<String, dynamic>> initiateSubscription(String planId, {String? paymentMethodId}) async {
    try {
      final idempotencyKey = const Uuid().v4();
      final response = await apiClient.dio.post(
        '/subscriptions/initiate',
        data: {'planId': planId, if (paymentMethodId != null) 'paymentMethodId': paymentMethodId},`);

// 2. SubscriptionRepositoryImpl
replace('lib/features/subscription/data/repositories/subscription_repository_impl.dart',
`  Future<InitiateSubscriptionResult> initiateSubscription(String planId) async {
    final json = await remoteDataSource.initiateSubscription(planId);`,
`  Future<InitiateSubscriptionResult> initiateSubscription(String planId, {String? paymentMethodId}) async {
    final json = await remoteDataSource.initiateSubscription(planId, paymentMethodId: paymentMethodId);`);

// 3. SubscriptionRepository
replace('lib/features/subscription/domain/repositories/subscription_repository.dart',
`  Future<InitiateSubscriptionResult> initiateSubscription(String planId);`,
`  Future<InitiateSubscriptionResult> initiateSubscription(String planId, {String? paymentMethodId});`);

// 4. SubscriptionBloc
replace('lib/features/subscription/presentation/bloc/subscription_bloc.dart',
`class PurchasePlanRequested extends SubscriptionEvent {
  final String planId;
  PurchasePlanRequested({required this.planId});
}`,
`class PurchasePlanRequested extends SubscriptionEvent {
  final String planId;
  final String? paymentMethodId;
  PurchasePlanRequested({required this.planId, this.paymentMethodId});
}`);

replace('lib/features/subscription/presentation/bloc/subscription_bloc.dart',
`  Future<void> _onPurchasePlanRequested(PurchasePlanRequested event, Emitter<SubscriptionState> emit) async {
    emit(PurchaseInProgress());
    try {
      final result = await subscriptionRepository.initiateSubscription(event.planId);`,
`  Future<void> _onPurchasePlanRequested(PurchasePlanRequested event, Emitter<SubscriptionState> emit) async {
    emit(PurchaseInProgress());
    try {
      final result = await subscriptionRepository.initiateSubscription(event.planId, paymentMethodId: event.paymentMethodId);`);

