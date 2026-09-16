class DestinationModeModel {
  final bool isActive;
  final String? address;
  final double? lat;
  final double? lng;

  DestinationModeModel({
    required this.isActive,
    this.address,
    this.lat,
    this.lng,
  });

  factory DestinationModeModel.fromJson(Map<String, dynamic> json) {
    return DestinationModeModel(
      isActive: json['isActive'] == true || json['status'] == 'active',
      address: json['address']?.toString() ?? json['destinationAddress']?.toString(),
      lat: (json['lat'] as num?)?.toDouble() ?? (json['destinationLat'] as num?)?.toDouble(),
      lng: (json['lng'] as num?)?.toDouble() ?? (json['destinationLng'] as num?)?.toDouble(),
    );
  }
}
