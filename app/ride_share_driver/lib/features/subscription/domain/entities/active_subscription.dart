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

  const ActiveSubscription({
    required this.id,
    required this.planId,
    required this.status,
    this.endDate,
    required this.currencyCode,
    required this.amountMinor,
  });

  factory ActiveSubscription.fromJson(Map<String, dynamic> json) {
    return ActiveSubscription(
      id: json['id'] as String,
      planId: json['planId'] as String,
      status: json['status'] as String,
      endDate: json['endDate'] as String?,
      currencyCode: json['currencyCode'] as String,
      amountMinor: json['amountMinor'] as int,
    );
  }
}
