import 'vehicle.dart';

class VehicleModel {
  final String id;
  final String vehicleTypeId;
  final String brand;
  final String name;
  final String slug;
  final int sortOrder;
  final bool isActive;
  final VehicleType? vehicleType;

  VehicleModel({
    required this.id,
    required this.vehicleTypeId,
    required this.brand,
    required this.name,
    required this.slug,
    this.sortOrder = 0,
    this.isActive = true,
    this.vehicleType,
  });

  String get displayName => '$brand $name';

  factory VehicleModel.fromJson(Map<String, dynamic> json) {
    VehicleType? vt;
    if (json['vehicleType'] is Map<String, dynamic>) {
      vt = VehicleType.fromJson(json['vehicleType'] as Map<String, dynamic>);
    }
    return VehicleModel(
      id: json['id']?.toString() ?? '',
      vehicleTypeId: json['vehicleTypeId']?.toString() ?? '',
      brand: json['brand']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      slug: json['slug']?.toString() ?? '',
      sortOrder: (json['sortOrder'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] as bool? ?? true,
      vehicleType: vt,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'vehicleTypeId': vehicleTypeId,
      'brand': brand,
      'name': name,
      'slug': slug,
      'sortOrder': sortOrder,
      'isActive': isActive,
    };
  }
}
