class VehicleType {
  final String id;
  final String name;
  final String slug;
  final int capacity;

  VehicleType({
    required this.id,
    required this.name,
    required this.slug,
    required this.capacity,
  });

  factory VehicleType.fromJson(Map<String, dynamic> json) {
    return VehicleType(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      capacity: (json['capacity'] as num?)?.toInt() ?? 4,
    );
  }
}

class DriverVehicle {
  final String id;
  final String vehicleTypeId;
  final String model;
  final String year;
  final String registrationNumber;
  final String? color;
  final bool isActive;

  DriverVehicle({
    required this.id,
    required this.vehicleTypeId,
    required this.model,
    required this.year,
    required this.registrationNumber,
    this.color,
    required this.isActive,
  });

  factory DriverVehicle.fromJson(Map<String, dynamic> json) {
    return DriverVehicle(
      id: json['id']?.toString() ?? '',
      vehicleTypeId: (json['vehicleTypeId'] ?? json['id'])?.toString() ?? '',
      model: json['model']?.toString() ?? '',
      year: json['year']?.toString() ?? '',
      registrationNumber: json['registrationNumber']?.toString() ?? '',
      color: json['color']?.toString(),
      isActive: json['isActive'] as bool? ?? false,
    );
  }
}
