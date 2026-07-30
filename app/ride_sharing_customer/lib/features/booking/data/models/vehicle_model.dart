import '../../domain/entities/vehicle.dart';

class VehicleModel extends Vehicle {
  const VehicleModel({
    required super.id,
    required super.name,
    required super.description,
    required super.baseFare,
    required super.perMile,
    required super.perMinute,
    required super.capacity,
    required super.multiplier,
    required super.etaMinutes,
    required super.type,
    super.isShared = false,
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? 'Fast and reliable ride',
      baseFare: (json['baseRate'] ?? 0.0 as num).toDouble(),
      perMile: (json['perKmRate'] ?? 0.0 as num).toDouble(),
      perMinute: (json['perMinRate'] ?? 0.0 as num).toDouble(),
      capacity: json['capacity'] ?? 4,
      multiplier: 1.0,
      etaMinutes: 5,
      type: json['name']?.toString().toLowerCase() ?? 'sedan',
      isShared: json['isShared'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'baseRate': baseFare,
      'perKmRate': perMile,
      'perMinRate': perMinute,
      'capacity': capacity,
      'multiplier': multiplier,
      'etaMinutes': etaMinutes,
      'type': type,
      'isShared': isShared,
    };
  }
}
