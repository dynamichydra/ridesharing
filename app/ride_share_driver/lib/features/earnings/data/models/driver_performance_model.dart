class DriverPerformanceModel {
  final double acceptanceRate;
  final double completionRate;
  final double cancellationRate;
  final double rating;
  final int totalTrips;

  DriverPerformanceModel({
    required this.acceptanceRate,
    required this.completionRate,
    required this.cancellationRate,
    required this.rating,
    required this.totalTrips,
  });

  factory DriverPerformanceModel.fromJson(Map<String, dynamic> json) {
    return DriverPerformanceModel(
      acceptanceRate: (json['acceptanceRate'] as num?)?.toDouble() ?? 95.0,
      completionRate: (json['completionRate'] as num?)?.toDouble() ?? 98.0,
      cancellationRate: (json['cancellationRate'] as num?)?.toDouble() ?? 2.0,
      rating: (json['rating'] as num?)?.toDouble() ?? (json['ratingAvg'] as num?)?.toDouble() ?? 4.9,
      totalTrips: (json['totalTrips'] as num?)?.toInt() ?? 0,
    );
  }
}
