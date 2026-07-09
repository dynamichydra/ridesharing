class DriverProfile {
  final String id;
  final String? phone;
  final String? name;
  final String? email;
  final String? profilePhoto;
  final String? dateOfBirth;
  final String? gender;
  final String? referralCode;
  final String? countryId;
  final String? stateId;
  final String? cityId;
  final String registrationStatus;
  final int registrationStep;
  final double rating;

  DriverProfile({
    required this.id,
    this.phone,
    this.name,
    this.email,
    this.profilePhoto,
    this.dateOfBirth,
    this.gender,
    this.referralCode,
    this.countryId,
    this.stateId,
    this.cityId,
    required this.registrationStatus,
    required this.registrationStep,
    required this.rating,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    return DriverProfile(
      id: json['id'],
      phone: json['phone'],
      name: json['name'],
      email: json['email'],
      profilePhoto: json['profilePhoto'],
      dateOfBirth: json['dateOfBirth'],
      gender: json['gender'],
      referralCode: json['referralCode'],
      countryId: json['countryId'],
      stateId: json['stateId'],
      cityId: json['cityId'],
      registrationStatus: json['registrationStatus'] ?? 'new',
      registrationStep: json['registrationStep'] ?? 0,
      rating: double.tryParse(json['rating']?.toString() ?? '5.0') ?? 5.0,
    );
  }
}
