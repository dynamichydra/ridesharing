import 'package:equatable/equatable.dart';

/// Cross-feature identity of the signed-in driver. Owned by `common/` (not a
/// single feature) because `auth`, `onboarding`, `profile` and `dashboard` all read it.
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
  final String? countryName;
  final String? stateId;
  final String? cityId;
  final String? cityName;
  final String registrationStatus;
  final int registrationStep;
  final String subscriptionStatus;
  final String? activeSubscriptionPlanName;
  final String? approvalStatus;
  final String? approvalNote;
  final double rating;
  final int totalRides;
  final String? vehicleModel;
  final String? vehicleNumber;
  final String? vehicleYear;
  final String? vehicleColor;
  final int totalDocuments;
  final int approvedDocuments;
  final int pendingDocuments;
  final bool isOnline;
  final DateTime? createdAt;

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
    this.countryName,
    this.stateId,
    this.cityId,
    this.cityName,
    required this.registrationStatus,
    required this.registrationStep,
    required this.subscriptionStatus,
    this.activeSubscriptionPlanName,
    this.approvalStatus,
    this.approvalNote,
    required this.rating,
    this.totalRides = 0,
    this.vehicleModel,
    this.vehicleNumber,
    this.vehicleYear,
    this.vehicleColor,
    this.totalDocuments = 0,
    this.approvedDocuments = 0,
    this.pendingDocuments = 0,
    this.isOnline = false,
    this.createdAt,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    final sub = json['activeSubscription'] as Map<String, dynamic>?;
    final docStats = json['documentStats'] as Map<String, dynamic>?;
    final dateStr = json['createdAt']?.toString();

    final rawReg = json['registrationStatus']?.toString().toLowerCase();
    final rawApp = json['approvalStatus']?.toString().toLowerCase();
    final rawStatus = json['status']?.toString().toLowerCase();

    // If any status indicator indicates approved/active, treat registration as approved
    final regStatus = (rawReg == 'approved' ||
            rawReg == 'active' ||
            rawApp == 'approved' ||
            rawStatus == 'active' ||
            rawStatus == 'approved')
        ? (rawReg == 'active' || rawStatus == 'active' ? 'active' : 'approved')
        : (json['registrationStatus']?.toString() ?? 'new');

    final subStatus = (sub != null && sub['status'] != null)
        ? sub['status'].toString()
        : (json['subscriptionStatus']?.toString() ?? 'inactive');

    return DriverProfile(
      id: json['id']?.toString() ?? '',
      phone: json['phone']?.toString(),
      name: json['name']?.toString(),
      email: json['email']?.toString(),
      profilePhoto: json['profilePhoto']?.toString(),
      dateOfBirth: json['dateOfBirth']?.toString(),
      gender: json['gender']?.toString(),
      referralCode: json['referralCode']?.toString(),
      countryId: json['countryId']?.toString(),
      countryName: json['countryName']?.toString(),
      stateId: json['stateId']?.toString(),
      cityId: json['cityId']?.toString(),
      cityName: json['cityName']?.toString(),
      registrationStatus: regStatus,
      registrationStep: (json['registrationStep'] as num?)?.toInt() ?? 0,
      subscriptionStatus: subStatus,
      activeSubscriptionPlanName: sub?['planName']?.toString(),
      approvalStatus: json['approvalStatus']?.toString() ?? json['status']?.toString(),
      approvalNote: json['approvalNote']?.toString(),
      rating: double.tryParse(json['rating']?.toString() ?? '5.0') ?? 5.0,
      totalRides: (json['totalRides'] as num?)?.toInt() ?? 0,
      vehicleModel: json['vehicleModel']?.toString(),
      vehicleNumber: json['vehicleNumber']?.toString(),
      vehicleYear: json['vehicleYear']?.toString(),
      vehicleColor: json['vehicleColor']?.toString(),
      totalDocuments: (docStats?['total'] as num?)?.toInt() ?? 0,
      approvedDocuments: (docStats?['approved'] as num?)?.toInt() ?? 0,
      pendingDocuments: (docStats?['pending'] as num?)?.toInt() ?? 0,
      isOnline: json['isOnline'] as bool? ?? false,
      createdAt: dateStr != null ? DateTime.tryParse(dateStr) : null,
    );
  }

  bool get isApproved {
    final reg = registrationStatus.toLowerCase();
    final app = (approvalStatus ?? '').toLowerCase();
    return reg == 'approved' ||
        reg == 'active' ||
        app == 'approved' ||
        app == 'active';
  }

  bool get hasActiveSubscription {
    final sub = subscriptionStatus.toLowerCase();
    return sub == 'active' ||
        sub == 'trial' ||
        activeSubscriptionPlanName != null;
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
        countryName,
        stateId,
        cityId,
        cityName,
        registrationStatus,
        registrationStep,
        subscriptionStatus,
        activeSubscriptionPlanName,
        approvalNote,
        rating,
        totalRides,
        vehicleModel,
        vehicleNumber,
        vehicleYear,
        vehicleColor,
        totalDocuments,
        approvedDocuments,
        pendingDocuments,
        isOnline,
        createdAt,
      ];
}
