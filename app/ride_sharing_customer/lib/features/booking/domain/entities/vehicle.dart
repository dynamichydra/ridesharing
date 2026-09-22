import 'package:equatable/equatable.dart';

class Vehicle extends Equatable {
  final String id;
  final String name;
  final String description;
  final double baseFare;
  final double perMile;
  final double perMinute;
  final int capacity;
  final double multiplier;
  final int etaMinutes;
  final String type;
  final bool isShared;
  final double distanceKm;
  final int durationMin;
  final int durationInTrafficMin;
  final Map<String, dynamic>? breakdown;
  final String countryId;

  const Vehicle({
    required this.id,
    required this.name,
    required this.description,
    required this.baseFare,
    required this.perMile,
    required this.perMinute,
    required this.capacity,
    required this.multiplier,
    required this.etaMinutes,
    required this.type,
    this.isShared = false,
    this.distanceKm = 0.0,
    this.durationMin = 0,
    this.durationInTrafficMin = 0,
    this.breakdown,
    this.countryId = '',
  });

  @override
  List<Object?> get props => [
        id,
        name,
        description,
        baseFare,
        perMile,
        perMinute,
        capacity,
        multiplier,
        etaMinutes,
        type,
        isShared,
        distanceKm,
        durationMin,
        durationInTrafficMin,
        breakdown,
        countryId,
      ];
}
