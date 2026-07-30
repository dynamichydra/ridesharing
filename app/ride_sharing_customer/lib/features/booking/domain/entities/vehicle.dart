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
      ];
}
