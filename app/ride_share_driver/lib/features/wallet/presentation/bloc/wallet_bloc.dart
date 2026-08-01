import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../data/datasources/wallet_remote_datasource.dart';

// ── Entities ──────────────────────────────────────────────────────────────────
class BankDetails {
  final String? bankName;
  final String? accountHolderName;
  final String? accountNumberLast4;
  final String? routingCode;
  final String? upiId;
  final String? walletProvider;
  final bool hasWalletNumber;
  final bool isVerified;

  const BankDetails({
    this.bankName,
    this.accountHolderName,
    this.accountNumberLast4,
    this.routingCode,
    this.upiId,
    this.walletProvider,
    this.hasWalletNumber = false,
    this.isVerified = false,
  });

  factory BankDetails.fromJson(Map<String, dynamic> json) => BankDetails(
        bankName: json['bankName'] as String?,
        accountHolderName: json['accountHolderName'] as String?,
        accountNumberLast4: json['accountNumberLast4'] as String?,
        routingCode: json['routingCode'] as String?,
        upiId: json['upiId'] as String?,
        walletProvider: json['walletProvider'] as String?,
        hasWalletNumber: json['hasWalletNumber'] as bool? ?? false,
        isVerified: json['isVerified'] as bool? ?? false,
      );
}

class PayoutAccount {
  final String status; // pending | approved | rejected
  final String? rejectionReason;
  final String gateway;

  const PayoutAccount({
    required this.status,
    this.rejectionReason,
    required this.gateway,
  });

  factory PayoutAccount.fromJson(Map<String, dynamic> json) => PayoutAccount(
        status: json['status'] as String? ?? 'pending',
        rejectionReason: json['rejectionReason'] as String?,
        gateway: json['gateway'] as String? ?? 'razorpay',
      );
}

class WalletInfo {
  final int balanceMinor;
  final String currencyCode;

  const WalletInfo({required this.balanceMinor, required this.currencyCode});

  factory WalletInfo.fromJson(Map<String, dynamic> json) => WalletInfo(
        balanceMinor: json['balanceMinor'] as int? ?? 0,
        currencyCode: json['currencyCode'] as String? ?? 'INR',
      );

  double get balanceAmount => balanceMinor / 100.0;
}

// ── Events ────────────────────────────────────────────────────────────────────
abstract class WalletEvent {}

class LoadWalletData extends WalletEvent {}

class SubmitBankDetails extends WalletEvent {
  final String? upiId;
  final String? accountNumber;
  final String? routingCode;
  final String? bankName;
  final String? accountHolderName;
  SubmitBankDetails({this.upiId, this.accountNumber, this.routingCode, this.bankName, this.accountHolderName});
}

// ── States ────────────────────────────────────────────────────────────────────
abstract class WalletState {}

class WalletInitial extends WalletState {}
class WalletLoading extends WalletState {}

class WalletLoaded extends WalletState {
  final BankDetails? bankDetails;
  final PayoutAccount? payoutAccount;
  final WalletInfo? walletInfo;
  WalletLoaded({this.bankDetails, this.payoutAccount, this.walletInfo});
}

class WalletSubmitting extends WalletState {
  final BankDetails? bankDetails;
  final PayoutAccount? payoutAccount;
  WalletSubmitting({this.bankDetails, this.payoutAccount});
}

class WalletSubmitSuccess extends WalletState {
  final BankDetails bankDetails;
  WalletSubmitSuccess(this.bankDetails);
}

class WalletError extends WalletState {
  final String message;
  WalletError(this.message);
}

// ── BLoC ──────────────────────────────────────────────────────────────────────
class WalletBloc extends Bloc<WalletEvent, WalletState> {
  final WalletRemoteDataSource dataSource;

  WalletBloc({required this.dataSource}) : super(WalletInitial()) {
    on<LoadWalletData>(_onLoad);
    on<SubmitBankDetails>(_onSubmit);
  }

  Future<void> _onLoad(LoadWalletData event, Emitter<WalletState> emit) async {
    emit(WalletLoading());
    try {
      final results = await Future.wait([
        dataSource.getBankDetails(),
        dataSource.getPayoutAccount(),
        dataSource.getWallet(),
      ]);

      final bankJson = results[0];
      final payoutJson = results[1];
      final walletJson = results[2];

      emit(WalletLoaded(
        bankDetails: bankJson != null ? BankDetails.fromJson(bankJson) : null,
        payoutAccount: payoutJson != null ? PayoutAccount.fromJson(payoutJson) : null,
        walletInfo: walletJson != null ? WalletInfo.fromJson(walletJson) : null,
      ));
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  Future<void> _onSubmit(SubmitBankDetails event, Emitter<WalletState> emit) async {
    final current = state;
    BankDetails? currentBank;
    PayoutAccount? currentPayout;
    if (current is WalletLoaded) {
      currentBank = current.bankDetails;
      currentPayout = current.payoutAccount;
    }

    emit(WalletSubmitting(bankDetails: currentBank, payoutAccount: currentPayout));
    try {
      final payload = <String, dynamic>{
        if (event.upiId != null && event.upiId!.isNotEmpty) 'upiId': event.upiId,
        if (event.accountNumber != null && event.accountNumber!.isNotEmpty) 'accountNumber': event.accountNumber,
        if (event.routingCode != null && event.routingCode!.isNotEmpty) 'routingCode': event.routingCode,
        if (event.bankName != null && event.bankName!.isNotEmpty) 'bankName': event.bankName,
        if (event.accountHolderName != null && event.accountHolderName!.isNotEmpty)
          'accountHolderName': event.accountHolderName,
      };
      final json = await dataSource.submitBankDetails(payload);
      emit(WalletSubmitSuccess(BankDetails.fromJson(json)));
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }
}
