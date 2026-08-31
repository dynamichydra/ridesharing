import 'package:equatable/equatable.dart';

class RiderSubscriptionPlan extends Equatable {
  final String id;
  final String countryId;
  final String name;
  final String type;
  final String currencyCode;
  final int priceMinor;
  final int? durationDays;
  final int trialDays;
  final List<String> features;
  final int sortOrder;
  final bool isActive;
  final String? gateway;
  final String? gatewayPlanId;

  const RiderSubscriptionPlan({
    required this.id,
    required this.countryId,
    required this.name,
    required this.type,
    required this.currencyCode,
    required this.priceMinor,
    this.durationDays,
    this.trialDays = 0,
    this.features = const [],
    this.sortOrder = 0,
    this.isActive = true,
    this.gateway,
    this.gatewayPlanId,
  });

  double get price => priceMinor / 100.0;

  String get formattedPrice {
    final symbol = _currencySymbol(currencyCode);
    final val = price.toStringAsFixed(price.truncateToDouble() == price ? 0 : 2);
    return '$symbol$val';
  }

  String get durationLabel {
    if (durationDays == null) return 'Lifetime';
    if (durationDays == 30 || type.toLowerCase() == 'monthly') return 'Monthly';
    if (durationDays == 90 || type.toLowerCase() == 'quarterly') return 'Quarterly';
    if (durationDays == 365 || type.toLowerCase() == 'yearly') return 'Yearly';
    return '$durationDays Days';
  }

  static String _currencySymbol(String code) {
    switch (code.toUpperCase()) {
      case 'USD':
        return '\$';
      case 'INR':
        return '₹';
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      default:
        return '$code ';
    }
  }

  factory RiderSubscriptionPlan.fromJson(Map<String, dynamic> json) {
    List<String> parsedFeatures = [];
    if (json['features'] != null) {
      if (json['features'] is List) {
        parsedFeatures = (json['features'] as List).map((e) => e.toString()).toList();
      }
    }

    return RiderSubscriptionPlan(
      id: json['id']?.toString() ?? '',
      countryId: json['countryId']?.toString() ?? json['country_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Plan',
      type: json['type']?.toString() ?? 'monthly',
      currencyCode: json['currencyCode']?.toString() ?? json['currency_code']?.toString() ?? 'USD',
      priceMinor: (json['priceMinor'] as num?)?.toInt() ?? (json['price_minor'] as num?)?.toInt() ?? 0,
      durationDays: (json['durationDays'] as num?)?.toInt() ?? (json['duration_days'] as num?)?.toInt(),
      trialDays: (json['trialDays'] as num?)?.toInt() ?? (json['trial_days'] as num?)?.toInt() ?? 0,
      features: parsedFeatures,
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? (json['sort_order'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] == true || json['is_active'] == true,
      gateway: json['gateway']?.toString(),
      gatewayPlanId: json['gatewayPlanId']?.toString() ?? json['gateway_plan_id']?.toString(),
    );
  }

  @override
  List<Object?> get props => [
        id,
        countryId,
        name,
        type,
        currencyCode,
        priceMinor,
        durationDays,
        trialDays,
        features,
        sortOrder,
        isActive,
      ];
}

class ActiveRiderSubscription extends Equatable {
  final String id;
  final String riderId;
  final String planId;
  final String status; // active | expired | cancelled | trial
  final DateTime? startDate;
  final DateTime? endDate;
  final String? currencyCode;
  final int? amountMinor;
  final DateTime? cancelledAt;
  final String? cancelNote;
  final RiderSubscriptionPlan? plan;

  const ActiveRiderSubscription({
    required this.id,
    required this.riderId,
    required this.planId,
    required this.status,
    this.startDate,
    this.endDate,
    this.currencyCode,
    this.amountMinor,
    this.cancelledAt,
    this.cancelNote,
    this.plan,
  });

  bool get isExpired {
    if (status.toLowerCase() == 'expired') return true;
    if (endDate != null && DateTime.now().isAfter(endDate!)) return true;
    return false;
  }

  bool get isActive => status.toLowerCase() == 'active' && !isExpired;

  int? get daysRemaining {
    if (endDate == null) return null; // Lifetime
    final diff = endDate!.difference(DateTime.now()).inDays;
    return diff < 0 ? 0 : diff;
  }

  factory ActiveRiderSubscription.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic>? subMap;
    Map<String, dynamic>? planMap;

    if (json.containsKey('subscription') && json['subscription'] is Map) {
      subMap = Map<String, dynamic>.from(json['subscription']);
      if (json.containsKey('plan') && json['plan'] is Map) {
        planMap = Map<String, dynamic>.from(json['plan']);
      }
    } else {
      subMap = json;
    }

    return ActiveRiderSubscription(
      id: subMap['id']?.toString() ?? '',
      riderId: subMap['riderId']?.toString() ?? subMap['rider_id']?.toString() ?? '',
      planId: subMap['planId']?.toString() ?? subMap['plan_id']?.toString() ?? '',
      status: subMap['status']?.toString() ?? 'active',
      startDate: subMap['startDate'] != null
          ? DateTime.tryParse(subMap['startDate'].toString())
          : (subMap['start_date'] != null ? DateTime.tryParse(subMap['start_date'].toString()) : null),
      endDate: subMap['endDate'] != null
          ? DateTime.tryParse(subMap['endDate'].toString())
          : (subMap['end_date'] != null ? DateTime.tryParse(subMap['end_date'].toString()) : null),
      currencyCode: subMap['currencyCode']?.toString() ?? subMap['currency_code']?.toString(),
      amountMinor: (subMap['amountMinor'] as num?)?.toInt() ?? (subMap['amount_minor'] as num?)?.toInt(),
      cancelledAt: subMap['cancelledAt'] != null
          ? DateTime.tryParse(subMap['cancelledAt'].toString())
          : null,
      cancelNote: subMap['cancelNote']?.toString(),
      plan: planMap != null ? RiderSubscriptionPlan.fromJson(planMap) : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        riderId,
        planId,
        status,
        startDate,
        endDate,
        currencyCode,
        amountMinor,
        plan,
      ];
}

class SubscriptionHistoryItem extends Equatable {
  final ActiveRiderSubscription subscription;
  final RiderSubscriptionPlan? plan;

  const SubscriptionHistoryItem({required this.subscription, this.plan});

  factory SubscriptionHistoryItem.fromJson(Map<String, dynamic> json) {
    final sub = ActiveRiderSubscription.fromJson(
        json.containsKey('subscription') && json['subscription'] is Map
            ? Map<String, dynamic>.from(json['subscription'])
            : json);

    RiderSubscriptionPlan? p;
    if (json.containsKey('plan') && json['plan'] is Map) {
      p = RiderSubscriptionPlan.fromJson(Map<String, dynamic>.from(json['plan']));
    }

    return SubscriptionHistoryItem(subscription: sub, plan: p);
  }

  @override
  List<Object?> get props => [subscription, plan];
}
