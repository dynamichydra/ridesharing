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
  final String? vehicleModelId;
  final String vehicleTypeId;
  final String? brand;
  final String model;
  final String year;
  final String registrationNumber;
  final String? color;
  final String? image;
  final bool isActive;

  DriverVehicle({
    required this.id,
    this.vehicleModelId,
    required this.vehicleTypeId,
    this.brand,
    required this.model,
    required this.year,
    required this.registrationNumber,
    this.color,
    this.image,
    required this.isActive,
  });

  factory DriverVehicle.fromJson(Map<String, dynamic> json) {
    return DriverVehicle(
      id: json['id']?.toString() ?? '',
      vehicleModelId: json['vehicleModelId']?.toString(),
      vehicleTypeId: (json['vehicleTypeId'] ?? json['id'])?.toString() ?? '',
      brand: json['brand']?.toString(),
      model: json['model']?.toString() ?? '',
      year: json['year']?.toString() ?? '',
      registrationNumber: json['registrationNumber']?.toString() ?? '',
      color: json['color']?.toString(),
      image: json['image']?.toString(),
      isActive: json['isActive'] as bool? ?? false,
    );
  }
}
