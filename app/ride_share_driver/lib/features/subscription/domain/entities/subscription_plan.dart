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

  final int? originalPriceMinor;
  final Map<String, dynamic>? specialOffer;
  final bool priorityMatching;
  final Map<String, dynamic>? entitlements;
  final List<String>? vehicleTypeIds;

  const SubscriptionPlan({
    required this.id,
    required this.name,
    required this.type,
    required this.currencyCode,
    required this.priceMinor,
    this.originalPriceMinor,
    this.durationDays,
    required this.trialDays,
    required this.features,
    this.maxRidesPerDay,
    this.gateway,
    this.specialOffer,
    this.priorityMatching = false,
    this.entitlements,
    this.vehicleTypeIds,
  });

  bool get hasDiscount =>
      (originalPriceMinor != null && originalPriceMinor! > priceMinor) ||
      (specialOffer != null && (specialOffer!['discountAmountMinor'] as num? ?? 0) > 0);

  double get priceMajor => priceMinor / 100.0;
  double? get originalPriceMajor => originalPriceMinor != null ? originalPriceMinor! / 100.0 : null;
  String? get specialOfferGroupName => specialOffer?['groupName'] as String?;
  int? get discountPercent => (specialOffer?['discountPercent'] as num?)?.toInt();
  int? get discountAmountMinor => (specialOffer?['discountAmountMinor'] as num?)?.toInt();

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) {
    final rawVehicleTypes = json['vehicleTypeIds'] as List? ?? json['vehicle_type_ids'] as List?;
    final rawFeatures = json['features'] as List?;

    return SubscriptionPlan(
      id: (json['id'] ?? '').toString(),
      name: (json['name'] ?? '').toString(),
      type: (json['type'] ?? 'monthly').toString(),
      currencyCode: (json['currencyCode'] ?? json['currency_code'] ?? 'INR').toString(),
      priceMinor: ((json['priceMinor'] ?? json['price_minor']) as num?)?.toInt() ?? 0,
      originalPriceMinor: ((json['originalPriceMinor'] ?? json['original_price_minor']) as num?)?.toInt(),
      durationDays: (json['durationDays'] ?? json['duration_days']) as int?,
      trialDays: ((json['trialDays'] ?? json['trial_days']) as num?)?.toInt() ?? 0,
      features: rawFeatures?.map((f) => f.toString()).toList() ?? const [],
      maxRidesPerDay: (json['maxRidesPerDay'] ?? json['max_rides_per_day']) as int?,
      gateway: json['gateway'] as String?,
      priorityMatching: (json['priorityMatching'] ?? json['priority_matching']) as bool? ?? false,
      specialOffer: json['specialOffer'] as Map<String, dynamic>?,
      entitlements: json['entitlements'] as Map<String, dynamic>?,
      vehicleTypeIds: rawVehicleTypes?.map((v) => v.toString()).toList(),
    );
  }
}
