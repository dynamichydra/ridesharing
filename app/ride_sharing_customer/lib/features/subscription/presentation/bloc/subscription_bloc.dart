import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/entities/rider_subscription_entities.dart';
import '../../domain/repositories/rider_subscription_repository.dart';

// ==========================================
// Events
// ==========================================
abstract class SubscriptionEvent extends Equatable {
  const SubscriptionEvent();
  @override
  List<Object?> get props => [];
}

class LoadSubscriptionOverview extends SubscriptionEvent {
  final String? countryId;
  const LoadSubscriptionOverview({this.countryId});

  @override
  List<Object?> get props => [countryId];
}

class PurchasePlanRequested extends SubscriptionEvent {
  final String planId;
  const PurchasePlanRequested({required this.planId});

  @override
  List<Object?> get props => [planId];
}

class VerifyPurchaseRequested extends SubscriptionEvent {
  final String planId;
  final String orderRef;
  final String paymentRef;
  final String? signature;

  const VerifyPurchaseRequested({
    required this.planId,
    required this.orderRef,
    required this.paymentRef,
    this.signature,
  });

  @override
  List<Object?> get props => [planId, orderRef, paymentRef, signature];
}

class PurchaseCancelled extends SubscriptionEvent {}

// ==========================================
// States
// ==========================================
abstract class SubscriptionState extends Equatable {
  const SubscriptionState();
  @override
  List<Object?> get props => [];
}

class SubscriptionInitial extends SubscriptionState {}

class SubscriptionOverviewLoading extends SubscriptionState {}

class SubscriptionOverviewLoaded extends SubscriptionState {
  final ActiveRiderSubscription? activeSubscription;
  final List<RiderSubscriptionPlan> availablePlans;
  final List<SubscriptionHistoryItem> history;

  const SubscriptionOverviewLoaded({
    required this.activeSubscription,
    required this.availablePlans,
    this.history = const [],
  });

  SubscriptionOverviewLoaded copyWith({
    ActiveRiderSubscription? activeSubscription,
    List<RiderSubscriptionPlan>? availablePlans,
    List<SubscriptionHistoryItem>? history,
  }) {
    return SubscriptionOverviewLoaded(
      activeSubscription: activeSubscription ?? this.activeSubscription,
      availablePlans: availablePlans ?? this.availablePlans,
      history: history ?? this.history,
    );
  }

  @override
  List<Object?> get props => [activeSubscription, availablePlans, history];
}

class PurchaseProcessing extends SubscriptionState {}

class RazorpayCheckoutReady extends SubscriptionState {
  final Map<String, dynamic> data;
  final String planId;

  const RazorpayCheckoutReady({required this.data, required this.planId});

  @override
  List<Object?> get props => [data, planId];
}

class StripeCheckoutReady extends SubscriptionState {
  final Map<String, dynamic> data;
  final String planId;

  const StripeCheckoutReady({required this.data, required this.planId});

  @override
  List<Object?> get props => [data, planId];
}

class PurchaseSuccess extends SubscriptionState {
  final ActiveRiderSubscription subscription;
  final String message;

  const PurchaseSuccess({required this.subscription, required this.message});

  @override
  List<Object?> get props => [subscription, message];
}

class SubscriptionError extends SubscriptionState {
  final String message;

  const SubscriptionError(this.message);

  @override
  List<Object?> get props => [message];
}

// ==========================================
// Bloc
// ==========================================
class SubscriptionBloc extends Bloc<SubscriptionEvent, SubscriptionState> {
  final RiderSubscriptionRepository _repository;

  ActiveRiderSubscription? _cachedActiveSub;
  List<RiderSubscriptionPlan> _cachedPlans = const [];
  List<SubscriptionHistoryItem> _cachedHistory = const [];

  SubscriptionBloc(this._repository) : super(SubscriptionInitial()) {
    on<LoadSubscriptionOverview>(_onLoadOverview);
    on<PurchasePlanRequested>(_onPurchasePlanRequested);
    on<VerifyPurchaseRequested>(_onVerifyPurchaseRequested);
    on<PurchaseCancelled>(_onPurchaseCancelled);
  }

  Future<void> _onLoadOverview(
    LoadSubscriptionOverview event,
    Emitter<SubscriptionState> emit,
  ) async {
    emit(SubscriptionOverviewLoading());
    try {
      final results = await Future.wait([
        _repository.getMySubscription(),
        _repository.getPlans(countryId: event.countryId),
        _repository.getSubscriptionHistory(page: 1, limit: 10),
      ]);

      _cachedActiveSub = results[0] as ActiveRiderSubscription?;
      _cachedPlans = (results[1] as List<RiderSubscriptionPlan>?) ?? [];
      _cachedHistory = (results[2] as List<SubscriptionHistoryItem>?) ?? [];

      emit(SubscriptionOverviewLoaded(
        activeSubscription: _cachedActiveSub,
        availablePlans: _cachedPlans,
        history: _cachedHistory,
      ));
    } catch (e) {
      emit(SubscriptionError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onPurchasePlanRequested(
    PurchasePlanRequested event,
    Emitter<SubscriptionState> emit,
  ) async {
    emit(PurchaseProcessing());
    try {
      final response = await _repository.initiateSubscription(event.planId);

      // Check if direct activation or gateway required
      final status = response['status']?.toString();
      if (status == 'active' || response.containsKey('riderId')) {
        // Direct dev-mode activation
        final sub = ActiveRiderSubscription.fromJson(response);
        _cachedActiveSub = sub;
        emit(PurchaseSuccess(
          subscription: sub,
          message: 'Membership activated successfully!',
        ));
        return;
      }

      final gateway = response['gateway']?.toString().toLowerCase();
      if (gateway == 'razorpay' || response.containsKey('keyId')) {
        emit(RazorpayCheckoutReady(data: response, planId: event.planId));
      } else if (gateway == 'stripe' || response.containsKey('clientSecret')) {
        emit(StripeCheckoutReady(data: response, planId: event.planId));
      } else {
        // Direct success fallback
        final sub = await _repository.getMySubscription();
        if (sub != null) {
          _cachedActiveSub = sub;
          emit(PurchaseSuccess(
            subscription: sub,
            message: 'Membership activated successfully!',
          ));
        } else {
          emit(SubscriptionOverviewLoaded(
            activeSubscription: _cachedActiveSub,
            availablePlans: _cachedPlans,
            history: _cachedHistory,
          ));
        }
      }
    } catch (e) {
      emit(SubscriptionError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  Future<void> _onVerifyPurchaseRequested(
    VerifyPurchaseRequested event,
    Emitter<SubscriptionState> emit,
  ) async {
    emit(PurchaseProcessing());
    try {
      final sub = await _repository.verifySubscription(
        planId: event.planId,
        orderRef: event.orderRef,
        paymentRef: event.paymentRef,
        signature: event.signature,
      );
      _cachedActiveSub = sub;
      emit(PurchaseSuccess(
        subscription: sub,
        message: 'Membership activated and verified!',
      ));
    } catch (e) {
      emit(SubscriptionError(e.toString().replaceAll('Exception: ', '')));
    }
  }

  void _onPurchaseCancelled(
    PurchaseCancelled event,
    Emitter<SubscriptionState> emit,
  ) {
    emit(SubscriptionOverviewLoaded(
      activeSubscription: _cachedActiveSub,
      availablePlans: _cachedPlans,
      history: _cachedHistory,
    ));
  }
}
