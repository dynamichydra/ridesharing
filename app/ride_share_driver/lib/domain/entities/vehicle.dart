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
      id: json['id'],
      name: json['name'],
      slug: json['slug'],
      capacity: json['capacity'] ?? 4,
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
      id: json['id'],
      vehicleTypeId: json['vehicleTypeId'],
      model: json['model'],
      year: json['year'],
      registrationNumber: json['registrationNumber'],
      color: json['color'],
      isActive: json['isActive'] ?? false,
    );
  }
}
