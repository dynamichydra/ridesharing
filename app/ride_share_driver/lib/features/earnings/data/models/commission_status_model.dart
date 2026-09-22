class ActivePlanSummary {
  final String id;
  final String name;
  final String? type;
  final DateTime? expiresAt;

  const ActivePlanSummary({
    required this.id,
    required this.name,
    this.type,
    this.expiresAt,
  });

  factory ActivePlanSummary.fromJson(Map<String, dynamic> json) {
    return ActivePlanSummary(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      type: json['type']?.toString(),
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'expiresAt': expiresAt?.toIso8601String(),
    };
  }
}

class CommissionStatusModel {
  final String driverId;
  final String subscriptionStatus;
  final bool isSubscriber;
  final ActivePlanSummary? activePlan;
  final double effectiveCommissionRate;
  final String effectiveCommissionPercentage;
  final double standardCommissionRate;
  final String standardCommissionPercentage;
  final String commissionSavingsPercentage;
  final int bookingFeeMinor;
  final bool bookingFeeWaived;
  final int priorityMatchingBonus;
  final String resolutionTier;
  final String ruleName;
  final String currencyCode;

  const CommissionStatusModel({
    required this.driverId,
    required this.subscriptionStatus,
    required this.isSubscriber,
    this.activePlan,
    required this.effectiveCommissionRate,
    required this.effectiveCommissionPercentage,
    required this.standardCommissionRate,
    required this.standardCommissionPercentage,
    required this.commissionSavingsPercentage,
    required this.bookingFeeMinor,
    required this.bookingFeeWaived,
    required this.priorityMatchingBonus,
    required this.resolutionTier,
    required this.ruleName,
    this.currencyCode = 'CAD',
  });

  static double _parseDouble(dynamic val, double fallback) {
    if (val == null) return fallback;
    if (val is num) return val.toDouble();
    return double.tryParse(val.toString()) ?? fallback;
  }

  static int _parseInt(dynamic val) {
    if (val == null) return 0;
    if (val is num) return val.toInt();
    return int.tryParse(val.toString()) ?? 0;
  }

  factory CommissionStatusModel.fromJson(Map<String, dynamic> json) {
    return CommissionStatusModel(
      driverId: json['driverId']?.toString() ?? '',
      subscriptionStatus: json['subscriptionStatus']?.toString() ?? 'inactive',
      isSubscriber: json['isSubscriber'] == true,
      activePlan: json['activePlan'] != null && json['activePlan'] is Map<String, dynamic>
          ? ActivePlanSummary.fromJson(json['activePlan'] as Map<String, dynamic>)
          : null,
      effectiveCommissionRate: _parseDouble(json['effectiveCommissionRate'], 0.20),
      effectiveCommissionPercentage: json['effectiveCommissionPercentage']?.toString() ?? '20%',
      standardCommissionRate: _parseDouble(json['standardCommissionRate'], 0.20),
      standardCommissionPercentage: json['standardCommissionPercentage']?.toString() ?? '20%',
      commissionSavingsPercentage: json['commissionSavingsPercentage']?.toString() ?? '0%',
      bookingFeeMinor: _parseInt(json['bookingFeeMinor']),
      bookingFeeWaived: json['bookingFeeWaived'] == true,
      priorityMatchingBonus: _parseInt(json['priorityMatchingBonus']),
      resolutionTier: json['resolutionTier']?.toString() ?? 'default',
      ruleName: json['ruleName']?.toString() ?? 'Default Platform Commission',
      currencyCode: json['currencyCode']?.toString() ?? json['currency']?.toString() ?? 'CAD',
    );
  }

  factory CommissionStatusModel.fallback() {
    return const CommissionStatusModel(
      driverId: '',
      subscriptionStatus: 'inactive',
      isSubscriber: false,
      activePlan: null,
      effectiveCommissionRate: 0.20,
      effectiveCommissionPercentage: '20%',
      standardCommissionRate: 0.20,
      standardCommissionPercentage: '20%',
      commissionSavingsPercentage: '0%',
      bookingFeeMinor: 0,
      bookingFeeWaived: false,
      priorityMatchingBonus: 0,
      resolutionTier: 'default',
      ruleName: 'Default Platform Commission',
      currencyCode: 'CAD',
    );
  }

  bool get hasSavings =>
      isSubscriber &&
      commissionSavingsPercentage != '0%' &&
      commissionSavingsPercentage != '0' &&
      !commissionSavingsPercentage.startsWith('0');

  double get bookingFee => bookingFeeMinor / 100.0;
}
