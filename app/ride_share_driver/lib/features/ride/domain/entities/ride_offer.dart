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
  final String? paymentMethod;

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
    this.paymentMethod,
  });

  factory RideOffer.fromJson(Map<String, dynamic> json) {
    double parseDouble(dynamic val) {
      if (val == null) return 0.0;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? 0.0;
    }

    int parseInt(dynamic val) {
      if (val == null) return 1;
      if (val is int) return val;
      return int.tryParse(val.toString()) ?? 1;
    }

    DateTime? parseExpiresAt(dynamic val) {
      if (val == null) return null;
      if (val is int) return DateTime.fromMillisecondsSinceEpoch(val);
      if (val is num) return DateTime.fromMillisecondsSinceEpoch(val.toInt());
      final asInt = int.tryParse(val.toString());
      if (asInt != null) return DateTime.fromMillisecondsSinceEpoch(asInt);
      return DateTime.tryParse(val.toString());
    }

    return RideOffer(
      rideId: json['rideId']?.toString() ?? '',
      ring: parseInt(json['ring']),
      radiusKm: parseDouble(json['radiusKm']),
      pickupAddress: json['pickupAddress'] as String?,
      dropAddress: json['dropAddress'] as String?,
      estimatedFare: parseDouble(json['estimatedFare']),
      currencyCode: json['currency'] as String? ?? '',
      distanceKm: parseDouble(json['distanceKm']),
      polyline: json['polyline'] as String?,
      pickupLat: parseDouble(json['pickupLat']),
      pickupLng: parseDouble(json['pickupLng']),
      dropLat: parseDouble(json['dropLat']),
      dropLng: parseDouble(json['dropLng']),
      myDistanceKm: parseDouble(json['myDistanceKm']),
      expiresAt: parseExpiresAt(json['expiresAt']),
      paymentMethod: json['paymentMethod']?.toString() ?? json['payment_method']?.toString(),
    );
  }
}
