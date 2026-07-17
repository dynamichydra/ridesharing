import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/entities/subscription_plan.dart';
import '../../domain/entities/active_subscription.dart';
import '../../domain/entities/initiate_subscription_result.dart';
import '../../domain/repositories/subscription_repository.dart';

// ── Events ──────────────────────────────────────────────────────────────────
abstract class SubscriptionEvent {}

class LoadPlans extends SubscriptionEvent {
  final String countryId;
  LoadPlans({required this.countryId});
}

class PurchasePlanRequested extends SubscriptionEvent {
  final String planId;
  PurchasePlanRequested({required this.planId});
}

class VerifyPurchaseRequested extends SubscriptionEvent {
  final String planId;
  final String orderRef;
  final String paymentRef;
  final String? signature;
  VerifyPurchaseRequested({
    required this.planId,
    required this.orderRef,
    required this.paymentRef,
    this.signature,
  });
}

/// Fired by the UI when the native checkout sheet was dismissed/cancelled —
/// returns to the plan list without treating it as a hard error.
class PurchaseCancelled extends SubscriptionEvent {}

// ── States ──────────────────────────────────────────────────────────────────
abstract class SubscriptionState {}

class SubscriptionInitial extends SubscriptionState {}

class PlansLoading extends SubscriptionState {}

class PlansLoaded extends SubscriptionState {
  final List<SubscriptionPlan> plans;
  PlansLoaded({required this.plans});
}

class PlansLoadFailed extends SubscriptionState {
  final String message;
  PlansLoadFailed({required this.message});
}

class PurchaseInProgress extends SubscriptionState {}

class RazorpayCheckoutReady extends SubscriptionState {
  final RazorpayCheckoutRequired data;
  final String planId;
  RazorpayCheckoutReady({required this.data, required this.planId});
}

class StripeCheckoutReady extends SubscriptionState {
  final StripeCheckoutRequired data;
  final String planId;
  StripeCheckoutReady({required this.data, required this.planId});
}

class PurchaseSucceeded extends SubscriptionState {
  final ActiveSubscription subscription;
  PurchaseSucceeded({required this.subscription});
}

class PurchaseFailed extends SubscriptionState {
  final String message;
  PurchaseFailed({required this.message});
}

// ── BLoC ───────────────────────────────────────────────────────────────────
class SubscriptionBloc extends Bloc<SubscriptionEvent, SubscriptionState> {
  final SubscriptionRepository subscriptionRepository;

  /// Kept so a cancelled/failed purchase can return to the already-fetched
  /// plan list instead of re-fetching or leaving the UI stateless.
  List<SubscriptionPlan> _cachedPlans = const [];

  SubscriptionBloc({required this.subscriptionRepository}) : super(SubscriptionInitial()) {
    on<LoadPlans>(_onLoadPlans);
    on<PurchasePlanRequested>(_onPurchasePlanRequested);
    on<VerifyPurchaseRequested>(_onVerifyPurchaseRequested);
    on<PurchaseCancelled>((event, emit) => emit(PlansLoaded(plans: _cachedPlans)));
  }

  Future<void> _onLoadPlans(LoadPlans event, Emitter<SubscriptionState> emit) async {
    emit(PlansLoading());
    try {
      final plans = await subscriptionRepository.getPlans(event.countryId);
      _cachedPlans = plans;
      emit(PlansLoaded(plans: plans));
    } catch (e) {
      emit(PlansLoadFailed(message: e.toString()));
    }
  }

  Future<void> _onPurchasePlanRequested(PurchasePlanRequested event, Emitter<SubscriptionState> emit) async {
    emit(PurchaseInProgress());
    try {
      final result = await subscriptionRepository.initiateSubscription(event.planId);
      switch (result) {
        case SubscriptionAlreadyActive(:final subscription):
          emit(PurchaseSucceeded(subscription: subscription));
        case RazorpayCheckoutRequired():
          emit(RazorpayCheckoutReady(data: result, planId: event.planId));
        case StripeCheckoutRequired():
          emit(StripeCheckoutReady(data: result, planId: event.planId));
      }
    } catch (e) {
      emit(PurchaseFailed(message: e.toString()));
    }
  }

  Future<void> _onVerifyPurchaseRequested(VerifyPurchaseRequested event, Emitter<SubscriptionState> emit) async {
    emit(PurchaseInProgress());
    try {
      final subscription = await subscriptionRepository.verifySubscription(
        planId: event.planId,
        orderRef: event.orderRef,
        paymentRef: event.paymentRef,
        signature: event.signature,
      );
      emit(PurchaseSucceeded(subscription: subscription));
    } catch (e) {
      emit(PurchaseFailed(message: e.toString()));
    }
  }
}
