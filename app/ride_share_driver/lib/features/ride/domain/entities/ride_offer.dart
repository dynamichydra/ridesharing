/// Maps the `ride:new_request` Socket.IO event — the only way a ride offer
/// reaches a driver (there is no REST poll-for-offer endpoint). See
/// `backend/src/kafka/consumers/index.js` (RIDE_MATCHED handler).
class RideOffer {
  final String rideId;
  final int ring;
  final double radiusKm;
  final String? pickupAddress;
  final String? dropAddress;
  final double estimatedFare;
  final String currencyCode;
  final double distanceKm;
  final String? polyline;
  final double pickupLat;
  final double pickupLng;
  final double dropLat;
  final double dropLng;
  final double myDistanceKm;
  final DateTime? expiresAt;

  const RideOffer({
    required this.rideId,
    required this.ring,
    required this.radiusKm,
    this.pickupAddress,
    this.dropAddress,
    required this.estimatedFare,
    required this.currencyCode,
    required this.distanceKm,
    this.polyline,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropLat,
    required this.dropLng,
    required this.myDistanceKm,
    this.expiresAt,
  });

  factory RideOffer.fromJson(Map<String, dynamic> json) {
    return RideOffer(
      rideId: json['rideId'] as String,
      ring: json['ring'] as int? ?? 1,
      radiusKm: (json['radiusKm'] as num?)?.toDouble() ?? 0,
      pickupAddress: json['pickupAddress'] as String?,
      dropAddress: json['dropAddress'] as String?,
      estimatedFare: (json['estimatedFare'] as num?)?.toDouble() ?? 0,
      currencyCode: json['currency'] as String? ?? '',
      distanceKm: (json['distanceKm'] as num?)?.toDouble() ?? 0,
      polyline: json['polyline'] as String?,
      pickupLat: (json['pickupLat'] as num).toDouble(),
      pickupLng: (json['pickupLng'] as num).toDouble(),
      dropLat: (json['dropLat'] as num).toDouble(),
      dropLng: (json['dropLng'] as num).toDouble(),
      myDistanceKm: (json['myDistanceKm'] as num?)?.toDouble() ?? 0,
      expiresAt: json['expiresAt'] != null ? DateTime.tryParse(json['expiresAt'].toString()) : null,
    );
  }
}
