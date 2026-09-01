import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../domain/repositories/wallet_repository.dart';

// ==========================================
// Wallet Events
// ==========================================
abstract class WalletEvent extends Equatable {
  const WalletEvent();

  @override
  List<Object?> get props => [];
}

class LoadWalletDetails extends WalletEvent {}

class AddWalletFunds extends WalletEvent {
  final double amount;
  final String paymentMethodId;

  const AddWalletFunds({required this.amount, required this.paymentMethodId});

  @override
  List<Object?> get props => [amount, paymentMethodId];
}

class InitiateWalletTopup extends WalletEvent {
  final double amount;
  const InitiateWalletTopup({required this.amount});

  @override
  List<Object?> get props => [amount];
}

class VerifyWalletTopup extends WalletEvent {
  final String orderRef;
  final String paymentRef;
  final String? signature;

  const VerifyWalletTopup({
    required this.orderRef,
    required this.paymentRef,
    this.signature,
  });

  @override
  List<Object?> get props => [orderRef, paymentRef, signature];
}

class TopupCancelled extends WalletEvent {}

class PayRideWithWallet extends WalletEvent {
  final String rideId;
  const PayRideWithWallet(this.rideId);

  @override
  List<Object?> get props => [rideId];
}

// ==========================================
// Wallet States
// ==========================================
abstract class WalletState extends Equatable {
  const WalletState();

  @override
  List<Object?> get props => [];
}

class WalletInitial extends WalletState {}

class WalletLoading extends WalletState {}

class WalletLoaded extends WalletState {
  final double balance;
  final String currency;
  final List<Map<String, dynamic>> transactions;

  const WalletLoaded({
    required this.balance,
    this.currency = 'INR',
    required this.transactions,
  });

  @override
  List<Object?> get props => [balance, currency, transactions];
}

class RazorpayTopupReady extends WalletState {
  final String keyId;
  final String gatewayOrderId;
  final int amountMinor;
  final String currencyCode;
  final String description;

  const RazorpayTopupReady({
    required this.keyId,
    required this.gatewayOrderId,
    required this.amountMinor,
    required this.currencyCode,
    required this.description,
  });

  @override
  List<Object?> get props => [keyId, gatewayOrderId, amountMinor, currencyCode, description];
}

class StripeTopupReady extends WalletState {
  final String clientSecret;
  final String publishableKey;
  final String gatewayOrderId;

  const StripeTopupReady({
    required this.clientSecret,
    required this.publishableKey,
    required this.gatewayOrderId,
  });

  @override
  List<Object?> get props => [clientSecret, publishableKey, gatewayOrderId];
}

class TopupProcessing extends WalletState {}

class AddFundsSuccess extends WalletState {}

class RidePaymentSuccess extends WalletState {
  final String rideId;
  const RidePaymentSuccess(this.rideId);

  @override
  List<Object?> get props => [rideId];
}

class WalletError extends WalletState {
  final String message;

  const WalletError(this.message);

  @override
  List<Object?> get props => [message];
}

// ==========================================
// Wallet BLoC
// ==========================================
class WalletBloc extends Bloc<WalletEvent, WalletState> {
  final WalletRepository _walletRepository;

  WalletBloc(this._walletRepository) : super(WalletInitial()) {
    on<LoadWalletDetails>(_onLoadWalletDetails);
    on<AddWalletFunds>(_onAddWalletFunds);
    on<InitiateWalletTopup>(_onInitiateWalletTopup);
    on<VerifyWalletTopup>(_onVerifyWalletTopup);
    on<TopupCancelled>(_onTopupCancelled);
    on<PayRideWithWallet>(_onPayRideWithWallet);
  }

  Future<void> _onLoadWalletDetails(LoadWalletDetails event, Emitter<WalletState> emit) async {
    emit(WalletLoading());
    try {
      final details = await _walletRepository.getWalletDetails();
      final double balance = (details['balance'] as num).toDouble();
      final String currency = details['currency']?.toString() ?? 'INR';
      final rawTxs = details['transactions'] as List? ?? [];
      final txsList = rawTxs.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      emit(WalletLoaded(balance: balance, currency: currency, transactions: txsList));
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  Future<void> _onAddWalletFunds(AddWalletFunds event, Emitter<WalletState> emit) async {
    emit(WalletLoading());
    try {
      await _walletRepository.addFunds(event.amount, event.paymentMethodId);
      emit(AddFundsSuccess());
      add(LoadWalletDetails());
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  Future<void> _onInitiateWalletTopup(InitiateWalletTopup event, Emitter<WalletState> emit) async {
    emit(TopupProcessing());
    try {
      final result = await _walletRepository.initiateTopup(event.amount);
      final gateway = (result['gateway'] ?? '').toString().toLowerCase();

      if (gateway == 'razorpay') {
        final keyId = result['keyId']?.toString() ?? '';
        final orderId = result['gatewayOrderId']?.toString() ?? '';
        final amtMinor = (event.amount * 100).round();
        final currency = result['currency']?.toString() ?? 'INR';
        emit(RazorpayTopupReady(
          keyId: keyId,
          gatewayOrderId: orderId,
          amountMinor: amtMinor,
          currencyCode: currency,
          description: 'Wallet Top Up',
        ));
      } else if (gateway == 'stripe') {
        final clientSecret = result['clientSecret']?.toString() ?? '';
        final publishableKey = result['publishableKey']?.toString() ?? '';
        final orderId = result['gatewayOrderId']?.toString() ?? '';
        emit(StripeTopupReady(
          clientSecret: clientSecret,
          publishableKey: publishableKey,
          gatewayOrderId: orderId,
        ));
      } else {
        // Dev mode / direct credit
        emit(AddFundsSuccess());
        add(LoadWalletDetails());
      }
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  Future<void> _onVerifyWalletTopup(VerifyWalletTopup event, Emitter<WalletState> emit) async {
    emit(TopupProcessing());
    try {
      await _walletRepository.verifyTopup(
        orderRef: event.orderRef,
        paymentRef: event.paymentRef,
        signature: event.signature,
      );
      emit(AddFundsSuccess());
      add(LoadWalletDetails());
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  void _onTopupCancelled(TopupCancelled event, Emitter<WalletState> emit) {
    emit(WalletInitial());
  }

  Future<void> _onPayRideWithWallet(PayRideWithWallet event, Emitter<WalletState> emit) async {
    emit(WalletLoading());
    try {
      await _walletRepository.payRideWithWallet(event.rideId);
      emit(RidePaymentSuccess(event.rideId));
      add(LoadWalletDetails());
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }
}
