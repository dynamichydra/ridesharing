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
  final List<Map<String, dynamic>> transactions;

  const WalletLoaded({required this.balance, required this.transactions});

  @override
  List<Object?> get props => [balance, transactions];
}

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
    on<PayRideWithWallet>(_onPayRideWithWallet);
  }

  Future<void> _onLoadWalletDetails(LoadWalletDetails event, Emitter<WalletState> emit) async {
    emit(WalletLoading());
    try {
      final details = await _walletRepository.getWalletDetails();
      final double balance = (details['balance'] as num).toDouble();
      final rawTxs = details['transactions'] as List? ?? [];
      final txsList = rawTxs.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      emit(WalletLoaded(balance: balance, transactions: txsList));
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
