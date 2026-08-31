import 'subscription_plan.dart';

/// Maps a `subscriptions` table row — returned as-is by both the dev-mode
/// "already activated" branch of `POST /subscriptions/initiate` and by
/// `GET /subscriptions/mine`.
class ActiveSubscription {
  final String id;
  final String planId;
  final String status;
  final String? endDate;
  final String currencyCode;
  final int amountMinor;
  final SubscriptionPlan? plan;

  const ActiveSubscription({
    required this.id,
    required this.planId,
    required this.status,
    this.endDate,
    required this.currencyCode,
    required this.amountMinor,
    this.plan,
  });

  bool get isExpired {
    if (status.toLowerCase() == 'expired') return true;
    if (endDate != null) {
      final dt = DateTime.tryParse(endDate!);
      if (dt != null && DateTime.now().isAfter(dt)) return true;
    }
    return false;
  }

  bool get isActive => status.toLowerCase() == 'active' && !isExpired;

  int? get daysRemaining {
    if (endDate == null) return null; // Lifetime
    final dt = DateTime.tryParse(endDate!);
    if (dt == null) return null;
    final diff = dt.difference(DateTime.now()).inDays;
    return diff < 0 ? 0 : diff;
  }

  factory ActiveSubscription.fromJson(Map<String, dynamic> json, {SubscriptionPlan? plan}) {
    return ActiveSubscription(
      id: (json['id'] ?? json['id'])?.toString() ?? '',
      planId: (json['planId'] ?? json['plan_id'])?.toString() ?? '',
      status: (json['status'])?.toString() ?? 'active',
      endDate: (json['endDate'] ?? json['end_date'])?.toString(),
      currencyCode: (json['currencyCode'] ?? json['currency_code'])?.toString() ?? 'USD',
      amountMinor: ((json['amountMinor'] ?? json['amount_minor']) as num?)?.toInt() ?? 0,
      plan: plan,
    );
  }
}
