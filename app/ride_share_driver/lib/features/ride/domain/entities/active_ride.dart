/// Maps a flat `rides` table row, as returned by every driver-facing ride
/// endpoint (`accept`/`arriving`/`start`/`complete`/`driver/active`).
///
/// Note: none of those endpoints join rider name/phone onto the ride row
/// (confirmed in `ride.service.js` — they all `select().from(rides)` with no
/// join), so this entity deliberately has no rider-identity fields. Showing
/// "your rider" without a name is a real backend gap, not an oversight here.
class ActiveRide {
  final String id;
  final String riderId;
  final String status;
  // requested | searching | accepted | arriving | started | completed | cancelled | expired
  final double pickupLat;
  final double pickupLng;
  final String? pickupAddress;
  final double dropLat;
  final double dropLng;
  final String? dropAddress;
  final int? estimatedFareMinor;
  final int? finalFareMinor;
  final String? currencyCode;
  final double? distanceKm;
  final int? durationMin;
  final String? polyline;

  const ActiveRide({
    required this.id,
    required this.riderId,
    required this.status,
    required this.pickupLat,
    required this.pickupLng,
    this.pickupAddress,
    required this.dropLat,
    required this.dropLng,
    this.dropAddress,
    this.estimatedFareMinor,
    this.finalFareMinor,
    this.currencyCode,
    this.distanceKm,
    this.durationMin,
    this.polyline,
  });

  factory ActiveRide.fromJson(Map<String, dynamic> json) {
    return ActiveRide(
      id: json['id'] as String,
      riderId: json['riderId'] as String,
      status: json['status'] as String? ?? 'requested',
      pickupLat: double.tryParse(json['pickupLat']?.toString() ?? '') ?? 0,
      pickupLng: double.tryParse(json['pickupLng']?.toString() ?? '') ?? 0,
      pickupAddress: json['pickupAddress'] as String?,
      dropLat: double.tryParse(json['dropLat']?.toString() ?? '') ?? 0,
      dropLng: double.tryParse(json['dropLng']?.toString() ?? '') ?? 0,
      dropAddress: json['dropAddress'] as String?,
      estimatedFareMinor: json['estimatedFareMinor'] as int?,
      finalFareMinor: json['finalFareMinor'] as int?,
      currencyCode: json['currencyCode'] as String?,
      distanceKm: double.tryParse(json['distanceKm']?.toString() ?? ''),
      durationMin: json['durationMin'] as int?,
      polyline: json['polyline'] as String?,
    );
  }
}
