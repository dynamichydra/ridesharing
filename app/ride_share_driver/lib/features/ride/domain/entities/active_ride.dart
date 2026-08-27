library active_ride;

/// Maps a flat `rides` table row, as returned by every driver-facing ride
/// endpoint (`accept`/`arriving`/`start`/`complete`/`driver/active`).
///
/// Note: none of those endpoints join rider name/phone onto the ride row
/// (confirmed in `ride.service.js` — they all `select().from(rides)` with no
/// join), so this entity deliberately has no rider-identity fields. Showing
/// "your rider" without a name is a real backend gap, not an oversight here.
import 'ride_offer.dart';

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
  final String? paymentMethod;

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
    this.paymentMethod,
  });

  factory ActiveRide.fromJson(Map<String, dynamic> json) {
    int? parseInt(dynamic val) {
      if (val == null) return null;
      if (val is int) return val;
      if (val is double) return val.toInt();
      return int.tryParse(val.toString());
    }

    double parseDouble(dynamic val, {double fallback = 0.0}) {
      if (val == null) return fallback;
      if (val is num) return val.toDouble();
      return double.tryParse(val.toString()) ?? fallback;
    }

    return ActiveRide(
      id: json['id']?.toString() ?? json['rideId']?.toString() ?? '',
      riderId: json['riderId']?.toString() ?? json['rider_id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'accepted',
      pickupLat: parseDouble(json['pickupLat'] ?? json['pickup_lat']),
      pickupLng: parseDouble(json['pickupLng'] ?? json['pickup_lng']),
      pickupAddress: json['pickupAddress']?.toString() ?? json['pickup_address']?.toString(),
      dropLat: parseDouble(json['dropLat'] ?? json['drop_lat']),
      dropLng: parseDouble(json['dropLng'] ?? json['drop_lng']),
      dropAddress: json['dropAddress']?.toString() ?? json['drop_address']?.toString(),
      estimatedFareMinor: parseInt(json['estimatedFareMinor'] ?? json['estimated_fare_minor']),
      finalFareMinor: parseInt(json['finalFareMinor'] ?? json['final_fare_minor']),
      currencyCode: json['currencyCode']?.toString() ?? json['currency_code']?.toString() ?? json['currency']?.toString(),
      distanceKm: parseDouble(json['distanceKm'] ?? json['distance_km']),
      durationMin: parseInt(json['durationMin'] ?? json['duration_min']),
      polyline: json['polyline']?.toString(),
      paymentMethod: json['paymentMethod']?.toString() ?? json['payment_method']?.toString(),
    );
  }

  factory ActiveRide.fromOffer(RideOffer offer, {String status = 'accepted'}) {
    return ActiveRide(
      id: offer.rideId,
      riderId: '',
      status: status,
      pickupLat: offer.pickupLat,
      pickupLng: offer.pickupLng,
      pickupAddress: offer.pickupAddress,
      dropLat: offer.dropLat,
      dropLng: offer.dropLng,
      dropAddress: offer.dropAddress,
      estimatedFareMinor: (offer.estimatedFare * 100).round(),
      currencyCode: offer.currencyCode,
      distanceKm: offer.distanceKm,
      polyline: offer.polyline,
      paymentMethod: offer.paymentMethod,
    );
  }
}
