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
  bool get isNegative => balanceMinor < 0;
}

class WalletTransactionItem {
  final String id;
  final String type; // credit | debit
  final double amount;
  final int balanceAfterMinor;
  final String reason;
  final String description;
  final DateTime createdAt;

  const WalletTransactionItem({
    required this.id,
    required this.type,
    required this.amount,
    required this.balanceAfterMinor,
    required this.reason,
    required this.description,
    required this.createdAt,
  });

  bool get isCredit => type == 'credit';

  factory WalletTransactionItem.fromJson(Map<String, dynamic> json) {
    final amtMinor = (json['amountMinor'] as num?)?.toInt() ?? 0;
    final type = (json['type'] as String?)?.toLowerCase() ?? 'credit';
    final reason = json['reason'] as String? ?? '';
    final rawDesc = json['description'] as String?;

    String displayDesc = rawDesc ?? '';
    final lowerReason = reason.toLowerCase();
    final lowerDesc = (rawDesc ?? '').toLowerCase();

    if (lowerReason.contains('payout') ||
        lowerReason.contains('withdrawal') ||
        lowerDesc.contains('payout') ||
        lowerDesc.contains('withdrawal') ||
        lowerDesc.contains('cash out') ||
        lowerDesc.contains('cashout')) {
      displayDesc = 'Cash Out';
    } else if (lowerReason.contains('fare') ||
        lowerReason.contains('earnings') ||
        lowerReason.contains('ride_fare') ||
        lowerReason.contains('ride') ||
        lowerDesc.contains('fare') ||
        lowerDesc.contains('earnings') ||
        lowerDesc.contains('ride')) {
      displayDesc = 'Ride Fare Received';
    } else if (lowerReason.contains('commission') || lowerDesc.contains('commission')) {
      displayDesc = 'Cash Commission Fee';
    } else if (lowerReason.contains('incentive') ||
        lowerReason.contains('bonus') ||
        lowerDesc.contains('incentive') ||
        lowerDesc.contains('bonus')) {
      displayDesc = 'Bonus Incentive';
    } else if (lowerReason.contains('refund') || lowerDesc.contains('refund')) {
      displayDesc = 'Ride Refund Deduction';
    } else if (displayDesc.isEmpty) {
      displayDesc = type == 'credit' ? 'Ride Fare Received' : 'Cash Out';
    }

    final dateStr = json['createdAt'] as String?;
    DateTime dt = DateTime.now();
    if (dateStr != null) {
      dt = DateTime.tryParse(dateStr) ?? DateTime.now();
    }

    return WalletTransactionItem(
      id: json['id']?.toString() ?? '',
      type: type,
      amount: amtMinor / 100.0,
      balanceAfterMinor: (json['balanceAfterMinor'] as num?)?.toInt() ?? 0,
      reason: reason,
      description: displayDesc,
      createdAt: dt,
    );
  }
}

// ── Events ────────────────────────────────────────────────────────────────────
abstract class WalletEvent {}

class LoadWalletData extends WalletEvent {}

class TopUpWallet extends WalletEvent {
  final double amount;
  final bool isDemo;
  TopUpWallet({required this.amount, this.isDemo = true});
}

class RequestInstantPayout extends WalletEvent {
  final double? amount;
  RequestInstantPayout({this.amount});
}

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
  final List<WalletTransactionItem> transactions;

  WalletLoaded({
    this.bankDetails,
    this.payoutAccount,
    this.walletInfo,
    this.transactions = const [],
  });
}

class WalletSubmitting extends WalletState {
  final BankDetails? bankDetails;
  final PayoutAccount? payoutAccount;
  final WalletInfo? walletInfo;
  WalletSubmitting({this.bankDetails, this.payoutAccount, this.walletInfo});
}

class WalletSubmitSuccess extends WalletState {
  final BankDetails bankDetails;
  WalletSubmitSuccess(this.bankDetails);
}

class WalletActionSuccess extends WalletState {
  final String message;
  WalletActionSuccess(this.message);
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
    on<TopUpWallet>(_onTopUp);
    on<RequestInstantPayout>(_onRequestPayout);
    on<SubmitBankDetails>(_onSubmit);
  }

  Future<void> _onLoad(LoadWalletData event, Emitter<WalletState> emit) async {
    emit(WalletLoading());
    try {
      final results = await Future.wait([
        dataSource.getBankDetails(),
        dataSource.getPayoutAccount(),
        dataSource.getWallet(),
        dataSource.getTransactions(),
      ]);

      final bankJson = results[0] as Map<String, dynamic>?;
      final payoutJson = results[1] as Map<String, dynamic>?;
      final walletJson = results[2] as Map<String, dynamic>?;
      final txListJson = results[3] as List<Map<String, dynamic>>? ?? [];

      final txItems = txListJson.map((e) => WalletTransactionItem.fromJson(e)).toList();

      emit(WalletLoaded(
        bankDetails: bankJson != null ? BankDetails.fromJson(bankJson) : null,
        payoutAccount: payoutJson != null ? PayoutAccount.fromJson(payoutJson) : null,
        walletInfo: walletJson != null ? WalletInfo.fromJson(walletJson) : null,
        transactions: txItems,
      ));
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  Future<void> _onTopUp(TopUpWallet event, Emitter<WalletState> emit) async {
    final current = state;
    BankDetails? currentBank;
    PayoutAccount? currentPayout;
    WalletInfo? currentWallet;
    if (current is WalletLoaded) {
      currentBank = current.bankDetails;
      currentPayout = current.payoutAccount;
      currentWallet = current.walletInfo;
    }

    emit(WalletSubmitting(bankDetails: currentBank, payoutAccount: currentPayout, walletInfo: currentWallet));
    try {
      final amountMinor = (event.amount * 100).round();
      await dataSource.topup(amountMinor, isDemo: event.isDemo);
      emit(WalletActionSuccess('₹${event.amount.toStringAsFixed(0)} added to wallet!'));
      add(LoadWalletData());
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  Future<void> _onRequestPayout(RequestInstantPayout event, Emitter<WalletState> emit) async {
    final current = state;
    BankDetails? currentBank;
    PayoutAccount? currentPayout;
    WalletInfo? currentWallet;
    if (current is WalletLoaded) {
      currentBank = current.bankDetails;
      currentPayout = current.payoutAccount;
      currentWallet = current.walletInfo;
    }

    emit(WalletSubmitting(bankDetails: currentBank, payoutAccount: currentPayout, walletInfo: currentWallet));
    try {
      final amountMinor = event.amount != null ? (event.amount! * 100).round() : null;
      await dataSource.requestInstantPayout(amountMinor: amountMinor);
      final msg = event.amount != null
          ? '₹${event.amount!.toStringAsFixed(0)} cashed out successfully!'
          : 'Instant cash out processed successfully!';
      emit(WalletActionSuccess(msg));
      add(LoadWalletData());
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }

  Future<void> _onSubmit(SubmitBankDetails event, Emitter<WalletState> emit) async {
    final current = state;
    BankDetails? currentBank;
    PayoutAccount? currentPayout;
    WalletInfo? currentWallet;
    if (current is WalletLoaded) {
      currentBank = current.bankDetails;
      currentPayout = current.payoutAccount;
      currentWallet = current.walletInfo;
    }

    emit(WalletSubmitting(bankDetails: currentBank, payoutAccount: currentPayout, walletInfo: currentWallet));
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
      add(LoadWalletData());
    } catch (e) {
      emit(WalletError(e.toString()));
    }
  }
}
