import 'package:equatable/equatable.dart';

class PayoutPagination extends Equatable {
  final int currentPage;
  final int itemsPerPage;
  final int totalItems;
  final int totalPages;

  const PayoutPagination({
    this.currentPage = 1,
    this.itemsPerPage = 20,
    this.totalItems = 0,
    this.totalPages = 1,
  });

  bool get hasNextPage => currentPage < totalPages;

  factory PayoutPagination.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const PayoutPagination();
    return PayoutPagination(
      currentPage: (json['currentPage'] as num?)?.toInt() ?? 1,
      itemsPerPage: (json['itemsPerPage'] as num?)?.toInt() ?? 20,
      totalItems: (json['totalItems'] as num?)?.toInt() ?? 0,
      totalPages: (json['totalPages'] as num?)?.toInt() ?? 1,
    );
  }

  @override
  List<Object?> get props => [currentPage, itemsPerPage, totalItems, totalPages];
}

class PayoutItem extends Equatable {
  final String id;
  final String driverId;
  final String? driverName;
  final String? driverPhone;
  final String? batchId;
  final String? payoutAccountId;
  final int amountMinor;
  final String currencyCode;
  final String gateway;
  final String? gatewayPayoutId;
  final String status; // 'pending' | 'processing' | 'completed' | 'failed'
  final String? failureReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PayoutItem({
    required this.id,
    required this.driverId,
    this.driverName,
    this.driverPhone,
    this.batchId,
    this.payoutAccountId,
    required this.amountMinor,
    required this.currencyCode,
    required this.gateway,
    this.gatewayPayoutId,
    required this.status,
    this.failureReason,
    required this.createdAt,
    required this.updatedAt,
  });

  double get amount => amountMinor / 100.0;

  bool get isCompleted => status.toLowerCase() == 'completed';
  bool get isProcessing => status.toLowerCase() == 'processing';
  bool get isPending => status.toLowerCase() == 'pending';
  bool get isFailed => status.toLowerCase() == 'failed';

  String get statusDisplay {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'Completed';
      case 'processing':
        return 'Processing';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return status.isNotEmpty
            ? status[0].toUpperCase() + status.substring(1)
            : 'Unknown';
    }
  }

  String get gatewayDisplay {
    switch (gateway.toLowerCase()) {
      case 'razorpay':
        return 'RazorpayX';
      case 'stripe':
        return 'Stripe Connect';
      default:
        return gateway.isNotEmpty
            ? gateway[0].toUpperCase() + gateway.substring(1)
            : 'Direct Transfer';
    }
  }

  factory PayoutItem.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic val) {
      if (val is String) {
        return DateTime.tryParse(val) ?? DateTime.now();
      }
      return DateTime.now();
    }

    return PayoutItem(
      id: json['id']?.toString() ?? '',
      driverId: json['driverId']?.toString() ?? '',
      driverName: json['driverName']?.toString(),
      driverPhone: json['driverPhone']?.toString(),
      batchId: json['batchId']?.toString(),
      payoutAccountId: json['payoutAccountId']?.toString(),
      amountMinor: (json['amountMinor'] as num?)?.toInt() ?? 0,
      currencyCode: json['currencyCode']?.toString() ?? json['currency_code']?.toString() ?? json['currency']?.toString() ?? '',
      gateway: json['gateway']?.toString() ?? 'razorpay',
      gatewayPayoutId: json['gatewayPayoutId']?.toString(),
      status: json['status']?.toString() ?? 'pending',
      failureReason: json['failureReason']?.toString(),
      createdAt: parseDate(json['createdAt']),
      updatedAt: parseDate(json['updatedAt']),
    );
  }

  @override
  List<Object?> get props => [
        id,
        driverId,
        batchId,
        payoutAccountId,
        amountMinor,
        currencyCode,
        gateway,
        gatewayPayoutId,
        status,
        failureReason,
        createdAt,
        updatedAt,
      ];
}
