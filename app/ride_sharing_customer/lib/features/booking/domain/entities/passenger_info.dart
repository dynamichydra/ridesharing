import 'package:equatable/equatable.dart';

class PassengerInfo extends Equatable {
  final String name;
  final String phoneNumber;
  final String phoneCountryCode;
  final String? email;
  final String passengerType; // 'family', 'friend', 'business', 'other'

  const PassengerInfo({
    required this.name,
    required this.phoneNumber,
    this.phoneCountryCode = '+91',
    this.email,
    this.passengerType = 'family',
  });

  Map<String, dynamic> toJson() {
    final map = <String, dynamic>{
      'name': name.trim(),
      'phoneNumber': phoneNumber.trim(),
      'phoneCountryCode': phoneCountryCode.trim(),
      'passengerType': passengerType.toLowerCase(),
    };
    if (email != null && email!.trim().isNotEmpty) {
      map['email'] = email!.trim();
    }
    return map;
  }

  factory PassengerInfo.fromJson(Map<String, dynamic> json) {
    return PassengerInfo(
      name: json['name']?.toString() ?? '',
      phoneNumber: json['phoneNumber']?.toString() ?? '',
      phoneCountryCode: json['phoneCountryCode']?.toString() ?? '+91',
      email: json['email']?.toString(),
      passengerType: json['passengerType']?.toString() ?? 'other',
    );
  }

  PassengerInfo copyWith({
    String? name,
    String? phoneNumber,
    String? phoneCountryCode,
    String? email,
    String? passengerType,
  }) {
    return PassengerInfo(
      name: name ?? this.name,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      phoneCountryCode: phoneCountryCode ?? this.phoneCountryCode,
      email: email ?? this.email,
      passengerType: passengerType ?? this.passengerType,
    );
  }

  @override
  List<Object?> get props => [
        name,
        phoneNumber,
        phoneCountryCode,
        email,
        passengerType,
      ];
}
