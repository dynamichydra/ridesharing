import '../entities/driver.dart';
import '../entities/geo.dart';
import '../entities/document.dart';
import '../entities/vehicle.dart';
import '../entities/question.dart';

class UploadUrlResponse {
  final String uploadUrl;
  final String key;
  UploadUrlResponse({required this.uploadUrl, required this.key});
}

class OnboardingConfig {
  final List<Country> countries;
  final List<OnboardingQuestion> questionnaire;
  final List<DocumentType> documentRequirements;
  final List<VehicleType> vehicleTypes;
  final String? termsUrl;
  final String? privacyPolicyUrl;
  final String? termsId;
  final String? privacyPolicyId;

  OnboardingConfig({
    required this.countries,
    required this.questionnaire,
    required this.documentRequirements,
    required this.vehicleTypes,
    this.termsUrl,
    this.privacyPolicyUrl,
    this.termsId,
    this.privacyPolicyId,
  });
}

class RegistrationSummary {
  final DriverProfile driver;
  final List<DriverVehicle> vehicles;
  final List<DriverDocument> documents;
  final List<DriverAnswer> answers;
  final bool isComplete;
  final List<String> missing;

  RegistrationSummary({
    required this.driver,
    required this.vehicles,
    required this.documents,
    required this.answers,
    required this.isComplete,
    required this.missing,
  });
}

abstract class OnboardingRepository {
  Future<DriverProfile> getProfile();
  Future<DriverProfile> updateProfile({
    required String name,
    required String email,
    String? dob,
    String? gender,
    String? referralCode,
  });
  Future<OnboardingConfig> getOnboardingConfig();
  Future<List<StateProvince>> getStates(String countryId);
  Future<List<City>> getCities(String stateId);
  Future<bool> setDrivingLocation({
    required String countryId,
    required String stateId,
    required String cityId,
  });
  Future<bool> acceptLegalDocument(String documentId);
  Future<List<DriverDocument>> getMyDocuments();
  Future<UploadUrlResponse> requestUploadUrl(
    String documentTypeId,
    String side,
    String contentType,
  );
  Future<bool> uploadDocumentFile(
    String uploadUrl,
    List<int> bytes,
    String contentType,
  );
  Future<DriverDocument> confirmDocument(
    String documentTypeId, {
    required String side,
    required String key,
    String? documentNumber,
    String? expiryDate,
  });
  Future<UploadUrlResponse> requestProfilePhotoUploadUrl(String contentType);
  Future<DriverProfile> confirmProfilePhoto(String key);
  Future<List<DriverVehicle>> getMyVehicles();
  Future<DriverVehicle> addVehicle({
    required String vehicleTypeId,
    required String model,
    required String year,
    required String registrationNumber,
    String? color,
  });
  Future<List<DriverAnswer>> getMyAnswers();
  Future<bool> submitAnswers(List<Map<String, dynamic>> answers);
  Future<RegistrationSummary> getRegistrationSummary();
  Future<DriverProfile> submitApplication();
}
