class SubscriptionPlan {
  final String id;
  final String name;
  final String type; // monthly | quarterly | yearly | lifetime | custom (admin-defined, not a fixed enum)
  final String currencyCode;
  final int priceMinor;
  final int? durationDays; // null = lifetime
  final int trialDays;
  final List<String> features;
  final int? maxRidesPerDay; // null = unlimited
  final String? gateway; // razorpay | stripe | null (not yet configured for this plan)

  const SubscriptionPlan({
    required this.id,
    required this.name,
    required this.type,
    required this.currencyCode,
    required this.priceMinor,
    this.durationDays,
    required this.trialDays,
    required this.features,
    this.maxRidesPerDay,
    this.gateway,
  });

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    return SubscriptionPlan(
      id: json['id'] as String,
      name: json['name'] as String,
      type: json['type'] as String,
      currencyCode: json['currencyCode'] as String,
      priceMinor: json['priceMinor'] as int,
      durationDays: json['durationDays'] as int?,
      trialDays: json['trialDays'] as int? ?? 0,
      features: (json['features'] as List?)?.map((f) => f.toString()).toList() ?? const [],
      maxRidesPerDay: json['maxRidesPerDay'] as int?,
      gateway: json['gateway'] as String?,
    );
  }
}
