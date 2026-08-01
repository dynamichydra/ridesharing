import 'package:equatable/equatable.dart';

/// Cross-feature identity of the signed-in driver. Owned by `common/` (not a
/// single feature) because `auth`, `onboarding` and `dashboard` all read it.
class DriverProfile extends Equatable {
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
  final String subscriptionStatus;
  final String? approvalNote;
  final double rating;
  final bool isOnline;

  const DriverProfile({
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
    required this.subscriptionStatus,
    this.approvalNote,
    required this.rating,
    this.isOnline = false,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    return DriverProfile(
      id: json['id'] as String,
      phone: json['phone'] as String?,
      name: json['name'] as String?,
      email: json['email'] as String?,
      profilePhoto: json['profilePhoto'] as String?,
      dateOfBirth: json['dateOfBirth'] as String?,
      gender: json['gender'] as String?,
      referralCode: json['referralCode'] as String?,
      countryId: json['countryId'] as String?,
      stateId: json['stateId'] as String?,
      cityId: json['cityId'] as String?,
      registrationStatus: json['registrationStatus'] as String? ?? 'new',
      registrationStep: json['registrationStep'] as int? ?? 0,
      subscriptionStatus: json['subscriptionStatus'] as String? ?? 'inactive',
      approvalNote: json['approvalNote'] as String?,
      rating: double.tryParse(json['rating']?.toString() ?? '5.0') ?? 5.0,
      isOnline: json['isOnline'] as bool? ?? false,
    );
  }

  bool get hasActiveSubscription => subscriptionStatus == 'active';

  DriverProfile copyWith({
    String? phone,
    String? name,
    String? email,
    String? profilePhoto,
    String? dateOfBirth,
    String? gender,
    String? referralCode,
    String? countryId,
    String? stateId,
    String? cityId,
    String? registrationStatus,
    int? registrationStep,
    String? subscriptionStatus,
    String? approvalNote,
    double? rating,
  }) {
    return DriverProfile(
      id: id,
      phone: phone ?? this.phone,
      name: name ?? this.name,
      email: email ?? this.email,
      profilePhoto: profilePhoto ?? this.profilePhoto,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      referralCode: referralCode ?? this.referralCode,
      countryId: countryId ?? this.countryId,
      stateId: stateId ?? this.stateId,
      cityId: cityId ?? this.cityId,
      registrationStatus: registrationStatus ?? this.registrationStatus,
      registrationStep: registrationStep ?? this.registrationStep,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
      approvalNote: approvalNote ?? this.approvalNote,
      rating: rating ?? this.rating,
    );
  }

  @override
  List<Object?> get props => [
        id,
        phone,
        name,
        email,
        profilePhoto,
        dateOfBirth,
        gender,
        referralCode,
        countryId,
        stateId,
        cityId,
        registrationStatus,
        registrationStep,
        subscriptionStatus,
        approvalNote,
        rating,
      ];
}
