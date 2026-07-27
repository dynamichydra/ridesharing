import 'package:equatable/equatable.dart';

class LocationModel extends Equatable {
  final double latitude;
  final double longitude;
  final String formattedAddress;
  final String? street;
  final String? locality;
  final String? city;
  final String? state;
  final String? country;
  final String? postalCode;
  final String? placeId;

  const LocationModel({
    required this.latitude,
    required this.longitude,
    required this.formattedAddress,
    this.street,
    this.locality,
    this.city,
    this.state,
    this.country,
    this.postalCode,
    this.placeId,
  });

  LocationModel copyWith({
    double? latitude,
    double? longitude,
    String? formattedAddress,
    String? street,
    String? locality,
    String? city,
    String? state,
    String? country,
    String? postalCode,
    String? placeId,
  }) {
    return LocationModel(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      formattedAddress: formattedAddress ?? this.formattedAddress,
      street: street ?? this.street,
      locality: locality ?? this.locality,
      city: city ?? this.city,
      state: state ?? this.state,
      country: country ?? this.country,
      postalCode: postalCode ?? this.postalCode,
      placeId: placeId ?? this.placeId,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'formattedAddress': formattedAddress,
      'street': street,
      'locality': locality,
      'city': city,
      'state': state,
      'country': country,
      'postalCode': postalCode,
      'placeId': placeId,
    };
  }

  factory LocationModel.fromJson(Map<String, dynamic> json) {
    return LocationModel(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      formattedAddress: json['formattedAddress'] as String? ?? '',
      street: json['street'] as String?,
      locality: json['locality'] as String?,
      city: json['city'] as String?,
      state: json['state'] as String?,
      country: json['country'] as String?,
      postalCode: json['postalCode'] as String?,
      placeId: json['placeId'] as String?,
    );
  }

  @override
  List<Object?> get props => [
        latitude,
        longitude,
        formattedAddress,
        street,
        locality,
        city,
        state,
        country,
        postalCode,
        placeId,
      ];
}
