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
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    return VehicleModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      baseFare: (json['base_fare'] as num).toDouble(),
      perMile: (json['per_mile'] as num).toDouble(),
      perMinute: (json['per_minute'] as num).toDouble(),
      capacity: json['capacity'] as int,
      multiplier: (json['multiplier'] as num).toDouble(),
      etaMinutes: json['eta_minutes'] as int,
      type: json['type'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'base_fare': baseFare,
      'per_mile': perMile,
      'per_minute': perMinute,
      'capacity': capacity,
      'multiplier': multiplier,
      'eta_minutes': etaMinutes,
      'type': type,
    };
  }
}
