class HeatmapZoneModel {
  final String id;
  final double lat;
  final double lng;
  final double radiusMeters;
  final String demandLevel; // low, medium, high, surge
  final double surgeMultiplier;

  HeatmapZoneModel({
    required this.id,
    required this.lat,
    required this.lng,
    required this.radiusMeters,
    required this.demandLevel,
    required this.surgeMultiplier,
  });

  factory HeatmapZoneModel.fromJson(Map<String, dynamic> json) {
    return HeatmapZoneModel(
      id: json['id']?.toString() ?? 'zone_${DateTime.now().millisecondsSinceEpoch}',
      lat: (json['lat'] as num?)?.toDouble() ?? (json['latitude'] as num?)?.toDouble() ?? 0.0,
      lng: (json['lng'] as num?)?.toDouble() ?? (json['longitude'] as num?)?.toDouble() ?? 0.0,
      radiusMeters: (json['radiusMeters'] as num?)?.toDouble() ?? (json['radius'] as num?)?.toDouble() ?? 1000.0,
      demandLevel: json['demandLevel']?.toString() ?? json['intensity']?.toString() ?? 'high',
      surgeMultiplier: (json['surgeMultiplier'] as num?)?.toDouble() ?? (json['multiplier'] as num?)?.toDouble() ?? 1.5,
    );
  }
}
