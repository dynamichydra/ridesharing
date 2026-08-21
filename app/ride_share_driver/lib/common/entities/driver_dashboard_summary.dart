class DriverTodayStats {
  final int totalRides;
  final double totalEarnings;
  final int totalWorkingMinutes;
  final double totalWorkingHours;
  final String formattedWorkingHours;

  const DriverTodayStats({
    required this.totalRides,
    required this.totalEarnings,
    required this.totalWorkingMinutes,
    required this.totalWorkingHours,
    required this.formattedWorkingHours,
  });

  factory DriverTodayStats.fromJson(Map<String, dynamic> json) {
    return DriverTodayStats(
      totalRides: (json['totalRides'] as num?)?.toInt() ?? 0,
      totalEarnings: (json['totalEarnings'] as num?)?.toDouble() ?? 0.0,
      totalWorkingMinutes: (json['totalWorkingMinutes'] as num?)?.toInt() ?? 0,
      totalWorkingHours: (json['totalWorkingHours'] as num?)?.toDouble() ?? 0.0,
      formattedWorkingHours: json['formattedWorkingHours'] as String? ?? '0m',
    );
  }
}

class DriverDashboardSummary {
  final String id;
  final String name;
  final String? phone;
  final String? profilePhoto;
  final String rating;
  final bool isOnline;
  final String? vehicleModel;
  final String? vehicleNumber;
  final DriverTodayStats today;

  const DriverDashboardSummary({
    required this.id,
    required this.name,
    this.phone,
    this.profilePhoto,
    required this.rating,
    required this.isOnline,
    this.vehicleModel,
    this.vehicleNumber,
    required this.today,
  });

  factory DriverDashboardSummary.fromJson(Map<String, dynamic> json) {
    return DriverDashboardSummary(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Driver',
      phone: json['phone'] as String?,
      profilePhoto: json['profilePhoto'] as String?,
      rating: json['rating']?.toString() ?? '5.0',
      isOnline: json['isOnline'] as bool? ?? false,
      vehicleModel: json['vehicleModel'] as String?,
      vehicleNumber: json['vehicleNumber'] as String?,
      today: DriverTodayStats.fromJson(
        json['today'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}
